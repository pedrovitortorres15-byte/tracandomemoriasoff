DROP POLICY IF EXISTS "Block non-admin writes to user_roles" ON public.user_roles;
CREATE POLICY "Block non-admin writes to user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

DROP POLICY IF EXISTS "Admins can list product-images" ON storage.objects;
CREATE POLICY "Admins can list product-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can list site-assets" ON storage.objects;
CREATE POLICY "Admins can list site-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_price numeric;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id é obrigatório em order_items';
  END IF;

  SELECT price INTO real_price
  FROM public.products
  WHERE id = NEW.product_id AND active = true;

  IF real_price IS NULL THEN
    RAISE EXCEPTION 'Produto inválido ou inativo (%).', NEW.product_id;
  END IF;

  IF abs(NEW.unit_price - real_price) > 0.01 THEN
    RAISE EXCEPTION 'unit_price (%) não corresponde ao preço real (%) do produto.', NEW.unit_price, real_price;
  END IF;

  IF NEW.quantity <= 0 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade fora do permitido (1-100).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_price ON public.order_items;
CREATE TRIGGER trg_validate_order_item_price
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_item_price();

DROP POLICY IF EXISTS "Guests and authenticated users can create order items" ON public.order_items;
CREATE POLICY "Guests and authenticated users can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND btrim(product_name) <> ''
  AND quantity > 0
  AND unit_price >= 0
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.created_at > (now() - interval '5 minutes')
  )
);

DROP POLICY IF EXISTS "Guests and authenticated users can create orders" ON public.orders;
CREATE POLICY "Guests and authenticated users can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  btrim(customer_name) <> ''
  AND length(customer_name) <= 120
  AND delivery_method = ANY (ARRAY['entrega'::text, 'retirada'::text])
  AND btrim(shipping_address) <> ''
  AND length(shipping_address) <= 500
  AND total >= 0
  AND total <= 100000
  AND (customer_phone IS NULL OR length(customer_phone) <= 30)
  AND (customer_email IS NULL OR length(customer_email) <= 160)
  AND (notes IS NULL OR length(notes) <= 1000)
  AND (personalization IS NULL OR length(personalization) <= 5000)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;