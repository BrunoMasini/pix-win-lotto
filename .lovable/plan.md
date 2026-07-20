# Plano: Ajustar função de geração de PIX no Mercado Pago

## Situação atual
A função server-side de geração de PIX já existe e cobre quase todos os requisitos pedidos:

- `src/lib/pix.server.ts` → `createPixPayment()` faz `POST https://api.mercadopago.com/v1/payments` com:
  - `Authorization: Bearer {MERCADO_PAGO_ACCESS_TOKEN}`
  - `Content-Type: application/json`
  - `X-Idempotency-Key` (usa o `orderId` UUID gerado como chave de idempotência)
  - payload com `transaction_amount`, `description`, `payment_method_id: "pix"`, `payer` (email, first_name, last_name, identification CPF)
  - retorna `id`, `qr_code_base64`, `qr_code`, `status`, `date_of_expiration`
- `src/lib/raffle.functions.ts` → `createPixOrder` (createServerFn):
  - valida entrada com Zod (`createOrderSchema`: números, nome, whatsapp, e-mail, CPF)
  - reserva números atomicamente via RPC `reserve_numbers`
  - chama `createPixPayment`
  - persiste o pedido na tabela `orders`
  - retorna `{ orderId, qrBase64, qrCopiaCola, expiresAt }` para o frontend
  - `try/catch` libera números em caso de falha
- Frontend (`src/routes/index.tsx` + `PixPaymentDialog`) já consome esses campos e faz polling via `getOrderStatus`.

## O que falta para atender 100% ao requisito

1. **Adicionar `notification_url` ao payload do Mercado Pago**
   - Hoje o webhook (`/api/public/mp-webhook`) existe, mas a URL não é enviada na criação do pagamento.
   - Adicionar campo opcional `notificationUrl` no `PixPaymentRequest` (em `pix.server.ts`) e incluí-lo no body quando presente.
   - Em `createPixOrder`, montar a URL a partir da variável de ambiente `PUBLIC_APP_URL` (a definir) ou, na ausência dela, derivar do header `Host` da request via `getRequestHost()` de `@tanstack/react-start/server`, sempre em HTTPS. Se nenhum dos dois estiver disponível, omitir o campo (Mercado Pago aceita a criação sem `notification_url`).

2. **Documentar/garantir presença dos secrets**
   - `MERCADO_PAGO_ACCESS_TOKEN` continua obrigatório (já validado com erro claro).
   - `MERCADO_PAGO_WEBHOOK_SECRET` continua opcional (webhook só valida assinatura quando presente).
   - Confirmar mensagens de erro amigáveis quando o token estiver ausente.

3. **Reforçar tratamento de erros no server function**
   - Já há `try` implícito via checagem de erros; adicionar `try/catch` explícito em `createPixOrder` envolvendo a chamada `createPixPayment` para liberar os números reservados caso o Mercado Pago retorne erro (hoje isso só acontece na falha do `insert`).

## Arquivos a alterar

- `src/lib/pix.server.ts`
  - Adicionar `notificationUrl?: string` em `PixPaymentRequest`.
  - Incluir `notification_url` no payload quando presente.
- `src/lib/raffle.functions.ts`
  - Importar `getRequestHost` de `@tanstack/react-start/server`.
  - Calcular `notificationUrl` (env `PUBLIC_APP_URL` → host da request → omitir).
  - Envolver a chamada a `createPixPayment` em `try/catch` que executa `release_numbers` antes de repropagar o erro.

## Não faz parte deste plano
- Alterar UI, esquema do banco, ou lógica de polling/webhook (já implementados e funcionando conforme o requisito).
- Configuração dos secrets em si — já são solicitados via formulário seguro.