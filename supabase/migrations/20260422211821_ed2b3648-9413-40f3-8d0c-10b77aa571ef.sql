DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Authenticated users can view active products'
  ) THEN
    CREATE POLICY "Authenticated users can view active products"
    ON public.products
    FOR SELECT
    TO authenticated
    USING (active = true);
  END IF;
END $$;