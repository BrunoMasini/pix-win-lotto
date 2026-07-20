
## Objetivo

Adicionar um painel administrativo protegido por login Google (restrito ao seu email), com relatório de vendas, edição do prêmio (título, descrição, imagem, valor por número), finalização de rifas com histórico público, e validação oficial `x-signature` do webhook do Mercado Pago.

## 1. Autenticação e controle de acesso

- Habilitar Google como provider social (`supabase--configure_social_auth`).
- Criar tabela `admin_users(email text unique)` populada só via SQL, com uma função `is_admin(uid)` que confere o email do `auth.users` contra essa tabela. Semear com o seu email (será solicitado depois).
- Rota `/auth` pública com botão "Entrar com Google" usando `lovable.auth.signInWithOAuth`.
- Layout `_authenticated` gerenciado pelo Cloud + gate extra em `_authenticated/admin/route.tsx` que chama uma server fn `requireAdmin` (checa `is_admin`) e redireciona não-admins.
- Somente seu email pode acessar; para criar novos admins, uma tela no painel permite adicionar/remover emails na tabela `admin_users` (protegida por `has_role`).

## 2. Modelo de dados — rifas versionadas

Nova tabela `raffles` (rifa ativa/finalizada) contendo:
- título, descrição, url da imagem, valor unitário, quantidade de números (fixo 101), status (`active` | `finished`), número sorteado, ganhador, data do sorteio.

Alterações:
- `raffle_numbers` ganha coluna `raffle_id` (FK). Índice único (`raffle_id`, `number`).
- `orders` ganha `raffle_id`.
- Funções RPC (`reserve_numbers`, `release_numbers`, `confirm_numbers`) recebem `_raffle_id`.
- Apenas UMA rifa `active` por vez (constraint parcial única).
- Ao "Finalizar rifa": admin informa número sorteado → rifa vira `finished`, e uma nova rifa `active` é criada (com prêmio editável antes ou depois) reiniciando a grade 00–100.

Políticas RLS:
- Leitura pública de `raffles` (para landing + histórico).
- Escrita apenas para admins (via `is_admin`).

## 3. Painel `/admin`

Rotas dentro de `_authenticated/admin/`:
- `index.tsx` — Dashboard: total arrecadado, nº pedidos pagos/pendentes/expirados, cotas vendidas, top compradores, gráfico simples de vendas por dia.
- `orders.tsx` — Tabela de pedidos com filtro por status, busca por nome/whatsapp/CPF, botão para exportar CSV.
- `raffle.tsx` — Edição do prêmio da rifa ativa (título, descrição, valor unitário, upload de imagem) + botão "Finalizar rifa" (form com número sorteado e nome do ganhador) que arquiva e cria uma nova.
- `admins.tsx` — Lista de emails admin com adicionar/remover (apenas seu email pode remover/adicionar outros).

Upload de imagem: bucket público `raffle-images` no Storage do Cloud; server fn faz signed upload e grava a URL em `raffles.image_url`.

## 4. Landing pública

- Consome a rifa `active` (título, descrição, imagem, valor) em vez dos valores hardcoded.
- Novo bloco "Rifas anteriores" mostrando cards das rifas `finished` com imagem, número sorteado e ganhador.
- Server fns `getActiveRaffle` e `listFinishedRaffles` (públicas, read-only com cliente publishable).

## 5. Webhook Mercado Pago com x-signature

Atualizar `src/routes/api/public/mp-webhook.ts`:
- Ler headers `x-signature` (`ts=...,v1=...`) e `x-request-id`.
- Buscar `data.id` no query string.
- Reconstruir o manifest `id:{data.id};request-id:{x-request-id};ts:{ts};` e comparar HMAC-SHA256 usando `MERCADO_PAGO_WEBHOOK_SECRET` com `timingSafeEqual`.
- Rejeitar 401 se assinatura inválida ou secret ausente.
- Solicitar o secret via `secrets--add_secret` (você copia da aba Webhooks do Mercado Pago).

## 6. Ordem de execução

1. Migração SQL: `raffles`, `admin_users`, `is_admin`, ajustes em `raffle_numbers`/`orders`, RLS, bucket de storage, seed da rifa atual + seu email admin (pergunto qual email antes).
2. Configurar Google OAuth + solicitar secret `MERCADO_PAGO_WEBHOOK_SECRET`.
3. Página `/auth`, gate admin, hook `useAdmin`.
4. Server fns admin (CRUD raffle, admin, upload, finalizar rifa, listagens de pedidos).
5. UI do painel admin (4 rotas).
6. Atualizar landing para consumir rifa ativa + card de rifas finalizadas.
7. Atualizar webhook com validação `x-signature`.
8. Testar fluxo end-to-end (login → editar prêmio → gerar PIX → webhook assinado → finalizar rifa).

## Detalhes técnicos

- Storage: bucket `raffle-images` público read, insert/update restrito a admins via policy `is_admin(auth.uid())`.
- `raffle_numbers`: migração popula a grade 00-100 automaticamente ao criar uma nova rifa (trigger `AFTER INSERT ON raffles`).
- Realtime da grade filtra por `raffle_id` da rifa ativa.
- Todas as server fns admin usam `requireSupabaseAuth` + checagem `is_admin` server-side antes de qualquer escrita.

## Perguntas para você antes de começar

- Qual é o seu email Google (para semear como primeiro admin)?
- Você já tem o `MERCADO_PAGO_WEBHOOK_SECRET` (gerado ao configurar a URL de notificação no painel do Mercado Pago) ou vou pedir depois de deployar a URL?
