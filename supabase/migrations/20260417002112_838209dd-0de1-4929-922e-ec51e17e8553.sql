-- ORDERS: remover policies permissivas
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;

-- ORDER_ITEMS: remover policies permissivas
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;

-- PRODUCTS: remover policies permissivas
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;

-- Permitir clientes anônimos vendo produtos ativos (já existe), permitir admins verem tudo
DROP POLICY IF EXISTS "Admins view all products" ON public.products;
CREATE POLICY "Admins view all products"
ON public.products FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Permitir clientes anônimos vendo pedidos próprios? Não — só admin.
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders"
ON public.orders FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete order items" ON public.order_items;
CREATE POLICY "Admins delete order items"
ON public.order_items FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));