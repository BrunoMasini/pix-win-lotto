# Três mudanças em uma entrega

## 1. Bug do número 8 — pagamento aprovado marcado como expirado

**Causa raiz (verificada no banco):** os dois pedidos com o número 8 foram para `status=expired` e o número voltou a `available`. O código que causa isso:

- `getOrderStatus` em `src/lib/raffle.functions.ts` (linhas 154-157) chama `release_numbers` assim que `expires_at < now()` — **sem consultar antes o status na Mercado Pago**. Se o comprador paga faltando poucos segundos, o polling da tela ou o `expire_stale_orders` (chamado em `listRaffleNumbers`) roda primeiro e expira o pedido.
- `expire_stale_orders` (função SQL) também expira em lote sem checar MP.
- O webhook em `src/routes/api/public/mp-webhook.ts` (linhas 63-71) só age em pedidos ainda `pending`, então quando a notificação `approved` chega, o pedido já está `expired` e o número não é confirmado.

**Correção:**

1. Em `getOrderStatus`: **sempre consultar `getPaymentStatus` na MP antes de expirar**. Se MP retornar `approved`, chamar `confirm_numbers` mesmo com `expires_at` vencido; só chamar `release_numbers` se MP também estiver `pending/expired/cancelled` (ou se não houver `mp_payment_id`).
2. No webhook `mp-webhook.ts`: quando MP notifica `approved`, permitir promover pedidos `pending` **ou `expired`** para `paid`. Precisamos de uma nova RPC `confirm_numbers_force(_order_id)` que:
   - Se o número ainda estiver `available`, marca como `paid` e vincula ao pedido.
   - Se estiver `pending` do mesmo pedido, marca `paid`.
   - Se estiver `paid`/`pending` de OUTRO pedido, retorna conflito (registrar e reembolsar manualmente — sem sobrescrever).
   - Atualiza `orders.status='paid'`, `paid_at=now()`.
3. Ajustar `expire_stale_orders`: só expirar quando `expires_at < now() - interval '2 minutes'` (janela de segurança para o webhook chegar). Alternativa mais simples: manter os 15 min, mas o passo (1) já cobre o buraco principal.
4. **Reparar o pedido `8a1efd48-1f7c-411b-8455-ef8a7e295685`**: consultar o status real na MP; se `approved`, rodar `confirm_numbers_force` para marcar o número 8 como pago para `guilhermegoncalvesf12@gmail.com`. Se não estiver aprovado, contatar o comprador (fora do plano).

## 2. Consulta de números comprados pelo cliente

Nova página pública `/meus-numeros` (arquivo `src/routes/meus-numeros.tsx`):

- Formulário simples: campo único de e-mail **ou** CPF.
- Botão "Consultar" chama nova server function `getBuyerOrders({ email?, cpf? })` em `src/lib/raffle.functions.ts`.
- Server fn usa `supabaseAdmin` (dentro do handler) para filtrar `orders` por `buyer_email` (case-insensitive) ou `buyer_cpf` (sanitizado) e retorna apenas campos seguros: `raffle_title`, `numbers`, `status`, `amount`, `created_at`, `paid_at`. Não retorna CPF/WhatsApp/e-mail cheios.
- Rate limiting básico: aceitar consulta somente se o input casar exatamente (email/CPF completo), para dificultar enumeração.
- UI mostra tabela por pedido: números, valor, status (Pago / Aguardando pagamento / Expirado), data. Se houver PIX pendente ainda válido, exibe botão "Ver PIX" que reabre `PixPaymentDialog` com os dados salvos no pedido.
- Link discreto "Consultar meus números" no topo da home (`src/routes/index.tsx`) e no rodapé.

## 3. Texto "Sorteio pela Loteria Federal"

Substituir o card "Sorteio" em `src/routes/index.tsx` (linhas 338-344) e ajustar a lista de benefícios no hero, incluindo em destaque:

> 🏆 **Sorteio pela Loteria Federal**
>
> ➡️ Vale os 2 últimos números do 1º prêmio.
>
> 📌 O sorteio será realizado somente quando TODOS os números forem vendidos.
>
> Assim que a cartela fechar, divulgarei a data da extração da Loteria Federal.
>
> **Exemplo:** 1º prêmio 54.**327** → vencedor **27**.

Colocar como um bloco destacado (card com borda dourada) na seção "Como funciona" para ganhar visibilidade, mantendo o restante da página.

## Arquivos afetados

- `src/lib/raffle.functions.ts` — corrigir `getOrderStatus`; adicionar `getBuyerOrders`.
- `src/routes/api/public/mp-webhook.ts` — usar nova RPC que aceita `expired`.
- Migração SQL — criar `confirm_numbers_force`; ajustar `expire_stale_orders` (janela de 2 min).
- `src/routes/meus-numeros.tsx` (novo) — página de consulta + reabertura do PIX.
- `src/routes/index.tsx` — texto Loteria Federal + link "Meus números".
- Correção pontual de dados: rodar `confirm_numbers_force` para o pedido do número 8, após verificar na MP.

## Verificação

1. `SELECT status FROM orders WHERE id='8a1efd48-...'` → `paid`; `raffle_numbers.number=8` → `paid`.
2. Fluxo E2E no sandbox: gerar PIX, deixar expirar propositalmente 10s antes de aprovar via `/v1/payments/{id}/test`, confirmar que o número ainda vira `paid` pelo webhook.
3. `/meus-numeros`: consultar com o e-mail do comprador do nº 8 e ver o pedido `paid` na lista.
4. Home: novo bloco Loteria Federal visível em mobile e desktop.
