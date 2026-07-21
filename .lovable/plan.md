## Diagnóstico

Os números 01 e 02 (e também o 00, que não aparece na grade) ficaram travados como "reservados" por causa de **pedidos de teste antigos que expiraram, mas nunca foram liberados**:

| Nº | Comprador | Expirou em |
|----|-----------|------------|
| 00 | Teste Automatizado | 20/07 17:53 |
| 01 | Teste Automatizado | 20/07 18:10 |
| 02 | Bruno Masini | 20/07 18:56 |

Todos os três pedidos estão com `status = pending` e `expires_at` no passado. A liberação automática (`release_numbers`) só roda quando alguém abre o modal do PIX daquele pedido ou quando o webhook do MP notifica cancelamento — como ninguém está fazendo polling desses pedidos abandonados, eles ficam presos.

## Plano

1. **Liberar agora** os 3 pedidos de teste travados chamando `release_numbers` para cada um. Isso marca os pedidos como `expired` e devolve os números 00, 01 e 02 para `available`.

2. **Prevenir recorrência** com um job leve: adicionar uma função `expire_stale_orders()` que varre pedidos `pending` com `expires_at < now()` e libera todos de uma vez. Chamá-la no início do `listRaffleNumbers` (server function que a landing usa a cada 10s) — custo desprezível e garante que qualquer pedido abandonado é limpo em segundos, sem cron.

## Detalhes técnicos

- Passo 1 usa `supabase--insert` executando `SELECT public.release_numbers(order_id)` para cada um dos 3 IDs listados acima.
- Passo 2 cria a função via migração:
  ```sql
  CREATE OR REPLACE FUNCTION public.expire_stale_orders()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
  BEGIN
    UPDATE public.raffle_numbers SET status='available', order_id=NULL, updated_at=now()
    WHERE status='pending' AND order_id IN (
      SELECT id FROM public.orders WHERE status='pending' AND expires_at < now()
    );
    UPDATE public.orders SET status='expired'
    WHERE status='pending' AND expires_at < now();
  END; $$;
  ```
  E em `src/lib/raffle.functions.ts`, no início do handler de `listRaffleNumbers`, chamar `supabaseAdmin.rpc('expire_stale_orders')` (fire-and-forget).
