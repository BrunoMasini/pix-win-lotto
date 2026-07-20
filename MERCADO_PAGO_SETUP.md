# Configuração do Mercado Pago — Rifa Online

O sistema de pagamento PIX é controlado por duas variáveis de ambiente.

## Variáveis obrigatórias

### `MERCADO_PAGO_ACCESS_TOKEN`
Define se o ambiente é **sandbox** (testes) ou **produção**.

- **Sandbox/testes**: começa com `TEST-...` (ex.: `TEST-1234567890-abcdef-123456...`)
  - Use para validar o fluxo de pagamento sem dinheiro real.
  - No Mercado Pago, vá em **Conta → Desenvolvedores e credenciais → Credenciais de teste**.
- **Produção**: começa com `APP_USR-...` (ex.: `APP_USR-1234567890-abcdef-123456...`)
  - Use quando o sorteio estiver aberto para vendas reais.
  - No Mercado Pago, vá em **Conta → Desenvolvedores e credenciais → Credenciais de produção**.

> **Nunca armazene o token em código.** Ele é salvo de forma segura nas configurações do projeto e acessado apenas pelo backend/serverless.

### `PUBLIC_APP_URL`
URL pública estável do aplicativo. É usada para montar o `notification_url` que o Mercado Pago chama quando o status de um pagamento muda.

- Preview: `https://id-preview--6dabacd1-ae32-490a-bf20-7af4e0bd9589.lovable.app`
- Produção (após publicar): `https://project--{project-id}.lovable.app`

Se essa variável não estiver configurada, o sistema tenta usar o host da requisição, mas isso pode falhar no runtime serverless.

## Variável opcional

### `MERCADO_PAGO_WEBHOOK_SECRET`
Chave usada para verificar a assinatura `x-signature` enviada pelo Mercado Pago nos webhooks.

- Configure no Mercado Pago ao cadastrar a URL de notificação.
- Se não for informada, o webhook ainda funciona, mas sem validação de assinatura.

## Como alternar entre sandbox e produção

1. Vá nas configurações de segredos do projeto.
2. Atualize `MERCADO_PAGO_ACCESS_TOKEN` para o token do ambiente desejado.
3. Reinicie o servidor de desenvolvimento (se estiver rodando localmente) ou aguarde a próxima publicação.
4. Nenhuma mudança de código é necessária.

## Recomendação de teste

Antes de ativar a produção, faça uma compra de teste em sandbox com valor mínimo (R$ 0,01) para confirmar que:

- O QR Code é gerado corretamente.
- O polling exibe "Pagamento Confirmado" após o pagamento.
- O webhook também atualiza o status (mesmo que o polling já tenha feito isso).
- Os números selecionados ficam marcados como pagos na grade.

## Endereço do webhook para configurar no Mercado Pago

```text
{PUBLIC_APP_URL}/api/public/mp-webhook
```

Exemplo com a URL de preview:

```text
https://id-preview--6dabacd1-ae32-490a-bf20-7af4e0bd9589.lovable.app/api/public/mp-webhook
```
