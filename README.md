# Remix of Lucky Draw Pix

Atue como um desenvolvedor Full-Stack sênior especialista em React, TypeScript, Tailwind CSS e integração de APIs de Pagamento.

Atualize/Crie o sistema de Rifa Online (Sorteio) para integrar o Gateway do Mercado Pago com validação do PIX em tempo real.

---

1. Visão Geral e Prêmio

- Título da Rifa: Grande Sorteio: Air Fryer Elgin + R$ 500 no PIX!

- Premiação Principal: 1 Fritadeira Air Fryer Elgin Facilita Fry 3,5L (1400W, Cor Preto) + R$ 500,00 no PIX.

- Link de referência visual: http://mercadolivre.com.br/fritadeira-air-fryer-facilita-fry-35litros-preta-elgin/p/MLB50493068

- Estética: Layout estilo landing page mobile-first, limpo e moderno.

---

2. Grade e Regras de Negócio

- Cotas: Números de 00 a 100 (total de 101 números).

- Valor unitário: R$ 25,00.

- Cálculo automático: Multiplicação dinâmica no painel (Qtd de números × R$ 25,00).

- Status das cotas:

  - Disponível: Clicável para seleção.

  - Pendente/Reservado: Cor amarela (aguardando confirmação do PIX).

  - Pago/Confirmado: Cor vermelha/cinza (desabilitado).

---

3. Integração com Mercado Pago (PIX Automático)

Crie uma estrutura (frontend + Serverless Endpoint/Backend Função) para consumir a API de Pagamentos do Mercado Pago (`v1/payments`).

1. Geração da Cobrança PIX:

   - Enviar payload para a API do Mercado Pago contendo:

     - `transaction_amount`: Valor total selecionado.

     - `payment_method_id`: "pix".

     - `payer`: `{ email, first_name, identification }` (coletados no formulário do participante).

     - `description`: `Rifa Air Fryer + R$500 - Números: [números selecionados]`.

   - A resposta deve retornar:

     - `qr_code_base64` (Imagem do QR Code PIX para ser exibida na tela).

     - `qr_code` (Código "PIX Copia e Cola").

     - `id` do pagamento (payment_id).

2. Verificação de Pagamento em Tempo Real:

   - Polling (Frontend): Fazer requisições periódicas a cada 3 a 5 segundos para verificar o status do `payment_id` (`GET /v1/payments/{id}`).

   - Status "approved": Quando o pagamento for confirmado:

     - Atualizar imediatamente a tela para um modal de sucesso ("Pagamento Confirmado! Seus números foram garantidos!").

     - Marcar os números selecionados definitivamente como "Pago/Confirmado" no banco de dados / estado local.

   - Expirado/Cancelado: Caso a cobrança expire, liberar os números de volta para a grade.

---

4. Fluxo e UX do Checkout

1. O participante seleciona os números.

2. Preenche formulário: Nome Completo, WhatsApp e E-mail / CPF (exigidos pelo Mercado Pago para criar o PIX).

3. Clica em "Gerar PIX".

4. Abre a tela/modal de Pagamento exibindo:

   - Imagem do QR Code PIX.

   - Botão "Copiar Código PIX".

   - Timer regressivo (ex: 10 a 15 minutos para pagar).

   - Indicador visual de "Aguardando pagamento...".

5. Assim que pago, a tela atualiza automaticamente sem necessidade de atualizar a página.

---

5. Requisitos de Código

- Criar um arquivo/estrutura de configuração isolada para a variável de ambiente `MERCADO_PAGO_ACCESS_TOKEN` (Access Token de Produção ou Testes).

- Mudar facilmente entre ambiente de Sandbox/Testes e Produção.

- Tratar erros de formulário, falha na API ou expiração de PIX.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pix-win-lotto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/85c14c15-1fdb-4491-b3ea-4671fc941711).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
