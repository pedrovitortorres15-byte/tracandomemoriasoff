CREATE OR REPLACE FUNCTION public.can_create_order_item_for_recent_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.created_at > (now() - interval '10 minutes')
  );
$$;

DROP POLICY IF EXISTS "Guests and authenticated users can create order items" ON public.order_items;

CREATE POLICY "Guests and authenticated users can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND product_id IS NOT NULL
  AND btrim(product_name) <> ''
  AND length(product_name) <= 500
  AND quantity > 0
  AND quantity <= 100
  AND unit_price >= 0
  AND unit_price <= 100000
  AND public.can_create_order_item_for_recent_order(order_id)
);