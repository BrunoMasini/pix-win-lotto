## Plano: Salvar webhook secret + construir painel admin

Você colou um valor que parece ser a chave de assinatura do webhook do Mercado Pago diretamente no chat. Por segurança, **não vou repetir/ecoar** esse valor e ele **não** deve ser salvo dessa forma — chaves precisam entrar pelo formulário seguro (`add_secret`), que criptografa antes de armazenar.

Recomendo trocar essa chave no painel do Mercado Pago (gerar uma nova assinatura), já que o valor trafegou em texto no chat. Depois seguimos o plano abaixo.

### Passo 1 — Salvar `MERCADO_PAGO_WEBHOOK_SECRET`
Vou abrir o formulário seguro para você colar a chave (nova, de preferência). Sem esse segredo a validação `x-signature` do webhook fica desativada.

### Passo 2 — Validação `x-signature` no webhook
Atualizar `src/routes/api/public/mp-webhook.ts`:
- Ler headers `x-signature` e `x-request-id`.
- Montar template `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.
- Calcular HMAC-SHA256 com o secret e comparar via `timingSafeEqual` com `v1`.
- Rejeitar com 401 se inválido; manter idempotência do processamento.

### Passo 3 — Migração admin + rifas versionadas
Nova migração criando:
- `raffles` (id, título, descrição, imagem_url, preço_por_número, status ativo/finalizada, ganhador, timestamps).
- `admin_users` (user_id → auth.users) + função `is_admin(uuid)` SECURITY DEFINER.
- Bucket de storage `raffle-images` (público read, admin write).
- Vincular `raffle_numbers` e `orders` a `raffle_id`.
- Seed: inserir rifa atual (Air Fryer) + admin `fradmasini@gmail.com` por email lookup.
- GRANTs corretos + RLS (admin CRUD; público SELECT em rifas).

### Passo 4 — Autenticação
- Rota `/auth` com botão "Entrar com Google" (usar `lovable.auth.signInWithOAuth`).
- Rota gate `_authenticated/route.tsx` (já managed) + gate extra `_authenticated/admin/route.tsx` verificando `is_admin` via server function.

### Passo 5 — Server functions admin (`src/lib/admin.functions.ts`)
Com `requireSupabaseAuth` + checagem `is_admin`:
- `listAllOrders` (relatório com filtro por rifa/status).
- `getSalesReport` (totais vendidos, arrecadado, pendentes).
- `createRaffle`, `updateRaffle`, `finalizeRaffle` (arquiva + zera grade + cria nova).
- `uploadRaffleImage` (para bucket).

### Passo 6 — UI do painel `/admin`
- Dashboard: cards com métricas (vendidos, arrecadado, pendentes, taxa conversão).
- Aba **Pedidos**: tabela com nome, whatsapp, números, valor, status, data.
- Aba **Rifa Ativa**: formulário editar título/descrição/imagem/preço.
- Aba **Finalizar**: sortear/marcar ganhador → arquivar → botão "Nova Rifa".
- Aba **Histórico**: lista rifas passadas com ganhador.

### Passo 7 — Landing page dinâmica
Atualizar `src/routes/index.tsx` para consumir a rifa ativa do banco (título, descrição, imagem, preço) em vez de valores hardcoded.

### Passo 8 — Validação
- Build.
- Playwright: login admin, editar rifa, ver landing atualizada, simular webhook assinado.

---

**Confirma?** Assim que você aprovar, começo pelo Passo 1 (formulário seguro do secret). E recomendo **regerar a chave no Mercado Pago** antes de colar.