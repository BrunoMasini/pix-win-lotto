# Plano: Configurar Mercado Pago

## Objetivo
Tornar o sistema de rifa funcional para pagamentos reais, configurando as credenciais do Mercado Pago e garantindo que a geração de PIX, o polling de status e o webhook estejam operacionais.

## Passos

1. **Coletar credenciais do Mercado Pago**
   - Solicitar ao usuário o `MERCADO_PAGO_ACCESS_TOKEN` (produção ou teste) usando o formulário seguro de secrets.
   - Solicitar opcionalmente o `MERCADO_PAGO_WEBHOOK_SECRET` para validar callbacks do Mercado Pago.
   - Explicar onde encontrar esses valores no painel do Mercado Pago (Desenvolvedores → Credenciais → Access Token; Webhooks → Assinatura secreta).

2. **Adicionar controle de ambiente Sandbox/Produção**
   - Criar uma variável de ambiente `MERCADO_PAGO_SANDBOX` (booleano) para facilitar a troca entre teste e produção sem alterar código.
   - Ajustar a URL da API do Mercado Pago dinamicamente quando em sandbox, se necessário (a API v1 já funciona com tokens de teste, mas a URL base pode ser alternada se o usuário usar contas de teste específicas).

3. **Garantir segurança do webhook**
   - Verificar o endpoint `/api/public/mp-webhook` já implementado.
   - Confirmar que a verificação de assinatura HMAC só é exigida quando `MERCADO_PAGO_WEBHOOK_SECRET` está configurado, permitindo testes manuais sem segredo.

4. **Validar endpoints e fluxo de pagamento**
   - Verificar se o endpoint de webhook está acessível publicamente e pronto para receber notificações.
   - Confirmar que o polling no frontend continua funcionando como fallback enquanto o webhook não chega.

5. **Instruções de teste**
   - Orientar o usuário a usar a conta de teste do Mercado Pago para simular um pagamento PIX sem dinheiro real, validando:
     - Geração do QR Code.
     - Atualização de status para "pago".
     - Marcação dos números como pagos no banco.

## Resultado esperado
Sistema pronto para receber pagamentos PIX reais via Mercado Pago, com ambiente configurável e validação segura de webhooks.

## Observações
- Os tokens nunca serão expostos no código; serão armazenados como secrets do projeto.
- A configuração de webhook no painel do Mercado Pago deve apontar para o URL publicado do projeto seguido de `/api/public/mp-webhook`.