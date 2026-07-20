
CREATE POLICY "Orders are backend only" ON public.orders
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
