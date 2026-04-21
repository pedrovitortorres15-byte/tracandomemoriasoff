DROP POLICY IF EXISTS "Guests and authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Guests and authenticated users can create order items" ON public.order_items;

CREATE POLICY "Guests and authenticated users can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  btrim(customer_name) <> ''
  AND delivery_method IN ('entrega', 'retirada')
  AND btrim(shipping_address) <> ''
  AND total >= 0
);

CREATE POLICY "Guests and authenticated users can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND btrim(product_name) <> ''
  AND quantity > 0
  AND unit_price >= 0
);