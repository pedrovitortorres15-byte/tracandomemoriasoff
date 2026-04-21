import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  brand_name: string;
  brand_tagline: string;
  logo_url: string | null;
  logo_full_url: string | null;
  hero_image_url: string | null;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  footer_about: string;
  whatsapp_number: string;
  instagram_handle: string;
  primary_hsl: string;
  primary_foreground_hsl: string;
  accent_hsl: string;
  background_hsl: string;
  pay_card_hsl: string;
  pay_pix_hsl: string;
  font_heading: string;
  font_body: string;
}

const FALLBACK: SiteSettings = {
  id: "",
  brand_name: "Loja Traçando Memórias",
  brand_tagline: "Presentes que contam histórias",
  logo_url: null,
  logo_full_url: null,
  hero_image_url: null,
  hero_eyebrow: "Loja Traçando Memórias · Presentes que contam histórias",
  hero_title: "Transformando momentos em memórias",
  hero_subtitle: "Canecas, caixas e produtos personalizados feitos à mão para eternizar suas histórias mais especiais.",
  hero_cta_text: "Ver Produtos",
  footer_about: "Transformamos seus momentos mais especiais em peças personalizadas e únicas. Cada produto é criado com amor e dedicação.",
  whatsapp_number: "558287060860",
  instagram_handle: "lojatracandomemorias",
  primary_hsl: "25 45% 30%",
  primary_foreground_hsl: "30 25% 96%",
  accent_hsl: "30 35% 75%",
  background_hsl: "30 25% 96%",
  pay_card_hsl: "210 80% 50%",
  pay_pix_hsl: "140 60% 35%",
  font_heading: "Playfair Display",
  font_body: "Inter",
};

// Fontes disponíveis (nome Google Font -> URL)
export const FONT_OPTIONS = [
  { heading: "Playfair Display", body: "Inter", label: "Elegante clássico" },
  { heading: "Cormorant Garamond", body: "Nunito", label: "Romântico suave" },
  { heading: "DM Serif Display", body: "DM Sans", label: "Moderno editorial" },
  { heading: "Fraunces", body: "Manrope", label: "Contemporâneo" },
  { heading: "Montserrat", body: "Montserrat", label: "Minimalista" },
];

const applyTheme = (s: SiteSettings) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", s.primary_hsl);
  root.style.setProperty("--primary-foreground", s.primary_foreground_hsl);
  root.style.setProperty("--accent", s.accent_hsl);
  root.style.setProperty("--background", s.background_hsl);
  root.style.setProperty("--ring", s.primary_hsl);
  root.style.setProperty("--pay-card", s.pay_card_hsl);
  root.style.setProperty("--pay-pix", s.pay_pix_hsl);
  root.style.setProperty("--font-heading", `'${s.font_heading}', serif`);
  root.style.setProperty("--font-body", `'${s.font_body}', sans-serif`);

  // carregar google font dinamicamente
  const id = "dynamic-google-fonts";
  const families = Array.from(new Set([s.font_heading, s.font_body])).map(
    (f) => `${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700`
  );
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      const s = { ...FALLBACK, ...(data as SiteSettings) };
      setSettings(s);
      applyTheme(s);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Nome único evita reutilizar um canal já inscrito pelo React StrictMode ou por outro componente.
    const channelName = `site_settings_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const channel = (supabase as any)
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => load()
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  return { settings, loading, reload: load };
};
