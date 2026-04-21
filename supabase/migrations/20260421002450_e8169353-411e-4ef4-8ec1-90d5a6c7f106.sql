DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Guests and authenticated users can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Guests and authenticated users can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);