-- Add custom_fields JSON to products (admin can define per-product fields)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add pickup config to delivery_settings
ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS pickup_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_window_text text DEFAULT 'Retirada das 14h às 17h',
  ADD COLUMN IF NOT EXISTS pickup_enabled boolean NOT NULL DEFAULT true;

-- Add delivery method + recipient info to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'entrega',
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text;