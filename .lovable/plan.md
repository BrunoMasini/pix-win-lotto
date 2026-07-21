## Objetivo
Ajustar a rifa para 01–99, corrigir a atualização automática da grade após pagamento, validar o fluxo completo e publicar hoje.

## 1. Números 01–99 (remover 00 e 100)

**Migração SQL** (nova):
- `UPDATE public.raffles SET total_numbers = 99 WHERE status = 'active';`
- `ALTER TABLE public.raffles ALTER COLUMN total_numbers SET DEFAULT 99;`
- Apagar da rifa ativa os números 0 e 100 se estiverem `available` (se algum estiver `pending`/`paid`, aborta com aviso).
- Reescrever `seed_raffle_numbers()` para `generate_series(1, NEW.total_numbers)`.
- Ajustar `finalize_raffle` para aceitar novo `total_numbers` (já aceita).

**Frontend**:
- `src/routes/index.tsx`: loop `for (let i = 1; i <= 99; i++)`, `availableCount = 99 - paidCount - pendingCount`, textos ajustados.
- `src/routes/_authenticated/admin.tsx`: `useState("99")` no default, `min={1}` e `max={active.total_numbers}` no seletor de ganhador.

## 2. Corrigir atualização automática após pagamento

Diagnóstico do fluxo atual (verificado):
- Polling `getOrderStatus` a cada 4s consulta MP → chama `confirm_numbers` RPC → atualiza `raffle_numbers` para `paid`.
- Realtime já está ativo em `raffle_numbers` (`ALTER PUBLICATION supabase_realtime ADD TABLE`) e o `index.tsx` escuta e invalida a query.
- Webhook `/api/public/mp-webhook` também chama `confirm_numbers`.

Causa provável do "não atualiza": o segredo `PUBLIC_APP_URL` aponta para o preview, e o webhook cadastrado no Mercado Pago recebe status mas o site publicado usa outra URL / o teste foi feito sem simular aprovação no sandbox.

Ajustes:
- Reduzir polling para 3s (`PixPaymentDialog.tsx`).
- Ao detectar `paid` no polling, invalidar imediatamente `["raffle-numbers"]` (garante atualização mesmo se o Realtime falhar).
- Após publicar, atualizar o segredo `PUBLIC_APP_URL` para `https://pix-raffle-winner.lovable.app` e reconfigurar a URL do webhook no painel do Mercado Pago para `https://pix-raffle-winner.lovable.app/api/public/mp-webhook`.

## 3. Teste completo via Playwright (sandbox)
- Abrir a home publicada, selecionar 3 números, preencher checkout com CPF de teste do Mercado Pago (`12345678909`), gerar PIX.
- Verificar QR Code e "copia e cola" renderizados.
- Verificar que o pedido foi criado em `orders` com status `pending` e `mp_payment_id` presente.
- Simular aprovação chamando a API do MP em modo sandbox (com o token atual) via `PUT /v1/payments/{id}` com `status: approved` — se o token for de produção, apenas documentar que a confirmação só ocorre com pagamento real ou webhook.
- Confirmar que a grade muda para "pago" via Realtime + polling.

## 4. Admin para fradmasini@gmail.com
Trigger `auto_promote_admin_trigger` já promove automaticamente esse e-mail ao fazer signup. Verificar em `admin_users` após primeiro login. Se já existir usuário mas não estar promovido, a migração vai fazer `INSERT ... ON CONFLICT DO NOTHING` para o user_id correspondente.

## 5. Publicação
- Rodar `security--run_security_scan`.
- Publicar via `preview_ui--publish`.
- Instruir o usuário a: (a) atualizar a URL do webhook no MP para a URL publicada; (b) fazer signup em `/auth` com `fradmasini@gmail.com`.

## Arquivos afetados
- `supabase/migrations/<novo>_raffle_1_to_99.sql`
- `src/routes/index.tsx`
- `src/routes/_authenticated/admin.tsx`
- `src/components/raffle/PixPaymentDialog.tsx`
