
CREATE POLICY "Admins can upload raffle images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'raffle-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update raffle images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'raffle-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete raffle images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'raffle-images' AND public.is_admin(auth.uid()));
