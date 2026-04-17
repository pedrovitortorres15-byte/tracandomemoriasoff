-- Galeria multi-mídia
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Checkout estruturado
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS shipping_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_complement TEXT,
  ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Performance
CREATE INDEX IF NOT EXISTS idx_products_active_created ON public.products (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- Garantir admin permanente para a dona
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'catharinaferrario@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Storage policies para a dona enviar imagens/vídeos do dispositivo
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins upload product-images" ON storage.objects;
CREATE POLICY "Admins upload product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update product-images" ON storage.objects;
CREATE POLICY "Admins update product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete product-images" ON storage.objects;
CREATE POLICY "Admins delete product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));