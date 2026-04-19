-- 1. Add delivery_date to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_window TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date) WHERE delivery_date IS NOT NULL;

-- 2. delivery_settings table (single row config)
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_order_limit INTEGER NOT NULL DEFAULT 10 CHECK (daily_order_limit > 0 AND daily_order_limit <= 200),
  min_business_days INTEGER NOT NULL DEFAULT 5 CHECK (min_business_days >= 0 AND min_business_days <= 60),
  delivery_window_text TEXT DEFAULT 'Entregas no período da tarde (14h às 17h)',
  pix_discount_percent INTEGER NOT NULL DEFAULT 10 CHECK (pix_discount_percent >= 0 AND pix_discount_percent <= 100),
  pix_discount_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.delivery_settings (daily_order_limit, min_business_days)
SELECT 10, 5
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings);

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read delivery settings"
  ON public.delivery_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage delivery settings"
  ON public.delivery_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Function to get capacity per date (last 60 days + future 90)
CREATE OR REPLACE FUNCTION public.get_delivery_capacity(start_date DATE, end_date DATE)
RETURNS TABLE(delivery_date DATE, count BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.delivery_date, COUNT(*)::bigint
  FROM public.orders o
  WHERE o.delivery_date IS NOT NULL
    AND o.delivery_date BETWEEN start_date AND end_date
    AND o.status NOT IN ('cancelado')
  GROUP BY o.delivery_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_delivery_capacity(DATE, DATE) TO anon, authenticated;