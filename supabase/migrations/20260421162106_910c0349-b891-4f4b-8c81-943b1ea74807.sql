-- site_settings: linha única editável pela dona
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  brand_name text NOT NULL DEFAULT 'Loja Traçando Memórias',
  brand_tagline text NOT NULL DEFAULT 'Presentes que contam histórias',
  logo_url text,
  logo_full_url text,
  hero_image_url text,
  hero_eyebrow text NOT NULL DEFAULT 'Loja Traçando Memórias · Presentes que contam histórias',
  hero_title text NOT NULL DEFAULT 'Transformando momentos em memórias',
  hero_subtitle text NOT NULL DEFAULT 'Canecas, caixas e produtos personalizados feitos à mão para eternizar suas histórias mais especiais.',
  hero_cta_text text NOT NULL DEFAULT 'Ver Produtos',
  footer_about text NOT NULL DEFAULT 'Transformamos seus momentos mais especiais em peças personalizadas e únicas. Cada produto é criado com amor e dedicação.',
  whatsapp_number text NOT NULL DEFAULT '558287060860',
  instagram_handle text NOT NULL DEFAULT 'lojatracandomemorias',
  primary_hsl text NOT NULL DEFAULT '25 45% 30%',
  primary_foreground_hsl text NOT NULL DEFAULT '30 25% 96%',
  accent_hsl text NOT NULL DEFAULT '30 35% 75%',
  background_hsl text NOT NULL DEFAULT '30 25% 96%',
  pay_card_hsl text NOT NULL DEFAULT '210 80% 50%',
  pay_pix_hsl text NOT NULL DEFAULT '140 60% 35%',
  font_heading text NOT NULL DEFAULT 'Playfair Display',
  font_body text NOT NULL DEFAULT 'Inter',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- seed primeira linha
INSERT INTO public.site_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- trigger updated_at
CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bucket para imagens do site (logos, hero)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-assets', 'site-assets', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Admins upload site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update site-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete site-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));