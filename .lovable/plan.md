Plano para resolver os dois pontos:

1. Corrigir o número 8
- Confirmei no banco que o número 8 está `available` na rifa ativa.
- Confirmei no Mercado Pago que um dos pagamentos do número 8 está `approved` (`169037564947`) e outro está `cancelled/expired`.
- Vou aplicar uma migração de reparo para marcar o pedido aprovado como `paid` e o número 8 como `paid`, vinculado ao pedido correto.
- Também vou deixar a correção automática já existente mais robusta, para que pedidos expirados mas aprovados pelo Mercado Pago sejam confirmados quando a grade ou o status for consultado.

2. Fazer o admin aparecer para você
- Confirmei que a tabela de administradores está vazia, então nenhum usuário tem permissão admin ainda.
- Vou ajustar o cadastro automático de admin para garantir que o e-mail `fradmasini@gmail.com` seja promovido quando fizer login/cadastro.
- Vou também adicionar um reparo de dados para conceder admin a esse e-mail caso a conta já exista.
- Depois disso, ao entrar pela página `/auth`, você deverá ser redirecionado para `/admin` e ver o painel.

3. Validar depois da implementação
- Verificar no banco que o número 8 ficou `paid`.
- Verificar que existe registro admin para o usuário correto.
- Conferir que a rota `/admin` está protegida e continua negando usuários não-admin.