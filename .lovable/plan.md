Token `MERCADO_PAGO_ACCESS_TOKEN` já foi salvo. Agora precisamos corrigir dois gargalos técnicos que impedem o fluxo de funcionar no ambiente atual, validar a build e deixar claro como alternar entre sandbox e produção.

### Problemas confirmados na leitura do código

1. **Server function `listRaffleNumbers` usa cliente Supabase manual sem o shim de fetch.** O projeto usa chaves novas no formato `sb_publishable_...` (opaque keys). O Supabase JS client envia por padrão `Authorization: Bearer <key>`, e o PostgREST rejeita com `Expected 3 parts in JWT; got 1`. Os clientes gerados (`src/integrations/supabase/client.ts` e `client.server.ts`) já contêm a função `createSupabaseFetch` que corrige isso. `listRaffleNumbers` cria um `createClient` do zero e não aplica esse shim, então a grade de números pode falhar ao carregar no preview/publicado.

2. **URL do webhook depende de `PUBLIC_APP_URL` ou `getRequestHost()`.** Em server functions rodando no runtime serverless, `getRequestHost()` pode não retornar o host correto para a notificação do Mercado Pago. Sem uma URL pública estável, o webhook não chega e a confirmação do PIX depende apenas do polling do usuário.

3. **Não há documentação/clareza sobre sandbox vs produção.** Hoje a mudança de ambiente é feita trocando apenas o valor de `MERCADO_PAGO_ACCESS_TOKEN`, mas isso não está explícito.

### O que será feito

1. **Corrigir `src/lib/raffle.functions.ts`**
   - Reutilizar o cliente Supabase público já gerado (`import { supabase } from "@/integrations/supabase/client"`) no lado do cliente, ou — como se trata de uma server function — importar e aplicar o mesmo `createSupabaseFetch` usado pelos clientes oficiais antes de chamar `createClient`.
   - Garantir que `listRaffleNumbers` funcione com as chaves `sb_publishable_...`.

2. **Configurar a URL pública do aplicativo**
   - Adicionar a variável de ambiente `PUBLIC_APP_URL` com a URL estável do projeto (preview ou produção, conforme o ambiente ativo).
   - Isso garante que o `notification_url` enviado ao Mercado Pago seja sempre uma URL pública válida, sem depender de `getRequestHost()`.

3. **Documentar ambiente sandbox vs produção**
   - Adicionar um comentário/documento breve explicando que basta trocar o valor de `MERCADO_PAGO_ACCESS_TOKEN` para alternar entre `TEST-...` (sandbox) e `APP_USR-...` (produção).
   - Recomendar testar com uma cobrança de valor mínimo (R$ 0,01) em sandbox antes de ativar produção.

4. **Validar a build**
   - Rodar `bun run build` e corrigir qualquer erro de tipo ou import após as alterações.

5. **Testar o fluxo de geração de PIX (sanity check)**
   - Usar a ferramenta de invocação de server function para chamar `createPixOrder` e verificar se a API do Mercado Pago retorna `id`, `qr_code_base64` e `qr_code` sem erro.
   - Não será realizado pagamento real; o teste apenas confirma que o token, a URL de webhook e a comunicação com a API estão corretos.

### Variáveis de ambiente necessárias

- `MERCADO_PAGO_ACCESS_TOKEN` — já salvo.
- `PUBLIC_APP_URL` — a ser configurada com a URL estável do ambiente (ex.: `https://id-preview--6dabacd1-ae32-490a-bf20-7af4e0bd9589.lovable.app`).
- `MERCADO_PAGO_WEBHOOK_SECRET` — opcional. Se informado, o webhook exige a assinatura `x-signature`. Se omitido, o webhook ainda funciona, mas sem verificação de assinatura.

### Entregável

Sistema de rifa com geração de PIX funcionando, webhook configurado com URL pública, polling automático, e instrução clara de como trocar entre sandbox e produção.