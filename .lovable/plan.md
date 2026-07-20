
## Objetivo
Landing page mobile-first de rifa (números 00–100, R$ 25,00 cada) com checkout PIX via Mercado Pago, confirmação automática por webhook + polling, e sincronização de status das cotas entre todos os visitantes.

## Etapas

### 1. Backend (Lovable Cloud)
Ativar Lovable Cloud e criar schema:

- `raffle_numbers` (seed 00–100)
  - `number` (int, PK, 0–100)
  - `status` ('available' | 'pending' | 'paid')
  - `order_id` (uuid, nullable)
  - `updated_at`
- `orders`
  - `id` (uuid, PK)
  - `numbers` (int[]) — cotas selecionadas
  - `amount` (numeric)
  - `buyer_name`, `buyer_whatsapp`, `buyer_email`, `buyer_cpf`
  - `mp_payment_id` (text)
  - `pix_qr_code_base64` (text), `pix_copia_cola` (text)
  - `status` ('pending' | 'paid' | 'expired' | 'cancelled')
  - `expires_at`, `created_at`, `paid_at`

RLS: leitura pública apenas de `raffle_numbers` (colunas number/status) e do próprio pedido por `id`. Escrita apenas via server functions (service role).

Seed 00–100 na mesma migration com GRANT `SELECT` a `anon`.

### 2. Configuração / Segredo
- `MERCADO_PAGO_ACCESS_TOKEN` será solicitado depois via formulário seguro (você disse que não tem agora; o código fica pronto para recebê-lo).
- `MERCADO_PAGO_WEBHOOK_SECRET` será solicitado depois para validar assinaturas de webhook.

### 3. Server Functions (createServerFn)
- `createPixOrder({ numbers, buyer })`
  1. Valida entrada (Zod: CPF, e-mail, nome, whatsapp, números 0–100).
  2. Verifica em transação que todos os números estão `available`; marca como `pending` com `expires_at = now + 15min`.
  3. Chama `POST https://api.mercadopago.com/v1/payments` com `transaction_amount`, `payment_method_id: "pix"`, `payer`, `description`, header `X-Idempotency-Key`.
  4. Salva `mp_payment_id`, `qr_code_base64`, `qr_code` no `orders`.
  5. Retorna `{ orderId, qrBase64, qrCopiaCola, expiresAt }`.
- `getOrderStatus({ orderId })` — polling; se `pending`, consulta `GET /v1/payments/{id}` no MP e atualiza banco (aprovado → marca números como `paid`; expirado/cancelado → libera números).
- Job de expiração via checagem preguiçosa dentro de `getOrderStatus` (libera se `expires_at < now` e ainda `pending`).

### 4. Server Route (webhook público)
`src/routes/api/public/mp-webhook.ts` (POST):
- Recebe notificação do MP, valida `x-signature` (HMAC) com `MERCADO_PAGO_WEBHOOK_SECRET`.
- Busca pagamento via API MP, atualiza `orders` e `raffle_numbers` (paid/cancelled).
- Retorna 200 rapidamente.
- URL estável para colar no painel MP: `https://project--<id>.lovable.app/api/public/mp-webhook`.

### 5. Frontend (rota `/` — substitui placeholder)
Landing mobile-first:
- **Hero**: título "Grande Sorteio: Air Fryer Elgin + R$ 500 no PIX!", imagem do prêmio, descrição, valor por cota.
- **Grade de números 00–100** (11×~10 grid, componente `NumberGrid`):
  - verde/disponível (clicável), amarelo/pending, cinza/paid (disabled).
  - Realtime via Supabase channel em `raffle_numbers` para atualização entre usuários.
- **Resumo fixo/bottom**: Qtd × R$25 = total; botão "Comprar".
- **Modal Checkout** (`CheckoutDialog`): formulário (Nome, WhatsApp, E-mail, CPF) com validação Zod + react-hook-form; botão "Gerar PIX".
- **Modal Pagamento** (`PixPaymentDialog`):
  - QR Code (`<img src="data:image/png;base64,...">`),
  - botão "Copiar código PIX" (copia `qr_code`),
  - timer regressivo até `expiresAt`,
  - polling `getOrderStatus` a cada 4s (`useQuery` com `refetchInterval`),
  - estados: aguardando → aprovado (modal sucesso) / expirado (fecha e libera números).
- **Toaster** para erros/sucesso.

### 6. Design system
Paleta quente moderna (vermelho/dourado sobre off-white) definida em `src/styles.css` como tokens semânticos oklch; tipografia via `<link>` no `__root.tsx`. SEO: título, description, og:title, og:description, og:image (imagem do prêmio) em `routes/index.tsx`.

### 7. Verificação
- Build automático.
- Chamar `stack_modern--invoke-server-function` em `createPixOrder` e no webhook para validar fluxo.
- Playwright: selecionar cotas, preencher formulário, gerar PIX, ver QR renderizado.

## Notas técnicas
- Todas as chamadas à API MP acontecem em server functions (`process.env.MERCADO_PAGO_ACCESS_TOKEN` lido dentro do handler).
- Transação de reserva usa RPC SQL (`SECURITY DEFINER`) para garantir atomicidade e evitar corrida.
- Polling frontend só enquanto o modal PIX estiver aberto; para em `paid`/`expired`.
- Nada de PII em `/api/public/*`; webhook só recebe `payment.id` e resolve via API MP.

## Depois de aprovar / após o build
1. Você colará o Access Token do Mercado Pago (Testes ou Produção) no formulário seguro que eu enviarei.
2. Você gerará a chave de assinatura de webhook no painel MP e colará no formulário seguro.

Aprova o plano para eu começar a construir?
