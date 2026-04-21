-- Campaigns table for seasonal rules (Dia das Mães 2026, etc.)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  delivery_date date,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read campaigns" ON public.campaigns;
CREATE POLICY "Anyone can read campaigns"
ON public.campaigns FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage campaigns" ON public.campaigns;
CREATE POLICY "Admins manage campaigns"
ON public.campaigns FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS campaigns_set_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link a product optionally to a campaign by slug
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS campaign_slug text;

-- Track campaign on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS campaign_slug text;

-- Seed Dia das Mães 2026 with fixed delivery date
INSERT INTO public.campaigns (slug, name, delivery_date, active, note)
VALUES ('dia-das-maes-2026', 'Dia das Mães 2026', '2026-05-08', true, 'Entregas desta campanha serão realizadas em 08/05/2026')
ON CONFLICT (slug) DO NOTHING;