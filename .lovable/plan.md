# Plano: Teste End-to-End do PIX no Mercado Pago Sandbox

## Objetivo
Confirmar que o fluxo de pagamento PIX funciona corretamente no ambiente sandbox do Mercado Pago, garantindo que:
1. O QR Code e o código copia-e-cola são gerados sem erros.
2. O pagamento é aprovado no sandbox.
3. O status do pedido muda para `paid` via polling e/ou webhook.
4. Os números comprados são marcados como pagos na grade automaticamente.

## Pré-condições verificadas
- O projeto está publicado em `https://pix-win-lotto.lovable.app`.
- Os segredos `MERCADO_PAGO_ACCESS_TOKEN`, `PUBLIC_APP_URL` e `MERCADO_PAGO_WEBHOOK_SECRET` foram salvos no turno anterior.
- O usuário atualizou a URL do webhook no painel do Mercado Pago para `https://pix-win-lotto.lovable.app/api/public/mp-webhook`.

## Passos do plano

### 1. Verificar configuração de ambiente
- Confirmar que o `PUBLIC_APP_URL` aponta para `https://pix-win-lotto.lovable.app`.
- Validar que o token do Mercado Pago começa com `TEST-` (sandbox).
- Verificar se há uma rifa ativa com números de 01 a 99 no banco.

### 2. Simular uma compra de teste
- Abrir o site publicado em uma sessão anônima do navegador.
- Selecionar 1 ou 2 números disponíveis na grade.
- Preencher o formulário de checkout com dados de teste válidos (nome, e-mail, CPF, WhatsApp).
- Gerar o PIX e capturar:
  - `orderId` gerado internamente.
  - `paymentId` retornado pelo Mercado Pago.
  - QR Code e código copia-e-cola.

### 3. Aprovar o pagamento no sandbox
- Usar a API de testes do Mercado Pago para forçar o status `approved` no pagamento criado:
  - Endpoint: `POST https://api.mercadopago.com/v1/payments/{payment_id}/test`
  - Autenticação: Bearer token de sandbox.
- Confirmar que a resposta da API indica sucesso.

### 4. Validar atualização do status
- Acompanhar o diálogo de pagamento no frontend:
  - O polling deve detectar o status `paid` em até 3 segundos.
  - O diálogo de sucesso deve ser exibido.
- Verificar no painel administrativo (`/_authenticated/admin`) se o pedido aparece como `paid`.

### 5. Validar atualização da grade
- Confirmar que os números comprados agora aparecem como pagos (cinza) na grade principal.
- Verificar se o Realtime do Supabase propagou a mudança sem necessidade de recarregar a página.

### 6. Validar webhook (se aplicável)
- Consultar os logs do webhook para confirmar que o Mercado Pago enviou a notificação.
- Verificar se a assinatura `x-signature` foi validada corretamente (quando `MERCADO_PAGO_WEBHOOK_SECRET` está configurado).

### 7. Documentar resultados e ajustes
- Se tudo funcionar: atualizar o guia `MERCADO_PAGO_SETUP.md` com a confirmação de que o fluxo sandbox foi validado.
- Se houver falhas: ajustar o código conforme o diagnóstico (ex.: timeout do polling, validação de assinatura, expiração do PIX) e repetir o teste.

## Riscos e observações
- O Mercado Pago pode ter latência na entrega do webhook; o polling é o caminho principal de confirmação para o usuário.
- Pagamentos em sandbox precisam ser aprovados manualmente via API de testes; não é possível pagar um PIX de teste usando um banco real.
- Se o token for de produção (`APP_USR-`), o teste de aprovação via API de sandbox não funcionará.

## Resultado esperado
Rifa online validada em sandbox: seleção de números, geração de PIX, aprovação de pagamento e atualização automática da grade funcionando corretamente.