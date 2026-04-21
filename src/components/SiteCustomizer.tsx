import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Upload, Palette, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { FONT_OPTIONS, type SiteSettings } from "@/hooks/useSiteSettings";

// converte hex -> "H S% L%"
const hexToHsl = (hex: string): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh *= 60;
  }
  return `${Math.round(hh)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToHex = (hsl: string): string => {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#000000";
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
};

interface Props {
  onSaved?: () => void;
}

export const SiteCustomizer = ({ onSaved }: Props) => {
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const logoFullRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("*").limit(1).maybeSingle();
      if (data) setForm(data as SiteSettings);
    })();
  }, []);

  const update = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  };

  const uploadImage = async (file: File, key: "logo_url" | "logo_full_url" | "hero_image_url") => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB)");
      return;
    }
    setUploadingKey(key);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      update(key, data.publicUrl);
      toast.success("Imagem enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + (e.message || ""));
    } finally {
      setUploadingKey(null);
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({
        brand_name: form.brand_name,
        brand_tagline: form.brand_tagline,
        logo_url: form.logo_url,
        logo_full_url: form.logo_full_url,
        hero_image_url: form.hero_image_url,
        hero_eyebrow: form.hero_eyebrow,
        hero_title: form.hero_title,
        hero_subtitle: form.hero_subtitle,
        hero_cta_text: form.hero_cta_text,
        footer_about: form.footer_about,
        whatsapp_number: form.whatsapp_number,
        instagram_handle: form.instagram_handle,
        primary_hsl: form.primary_hsl,
        primary_foreground_hsl: form.primary_foreground_hsl,
        accent_hsl: form.accent_hsl,
        background_hsl: form.background_hsl,
        pay_card_hsl: form.pay_card_hsl,
        pay_pix_hsl: form.pay_pix_hsl,
        font_heading: form.font_heading,
        font_body: form.font_body,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Personalização salva!");
      onSaved?.();
    }
  };

  if (!form) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  const ColorField = ({ label, hslKey, hint }: { label: string; hslKey: keyof SiteSettings; hint?: string }) => {
    const hsl = (form[hslKey] as string) || "0 0% 0%";
    const hex = hslToHex(hsl);
    return (
      <div>
        <label className="text-sm font-medium block mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => update(hslKey, hexToHsl(e.target.value) as any)}
            className="h-10 w-14 rounded border cursor-pointer"
          />
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-mono text-muted-foreground">{hex.toUpperCase()}</span>
            <span className="text-[10px] text-muted-foreground">{hsl}</span>
          </div>
        </div>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </div>
    );
  };

  const ImageField = ({
    label,
    currentUrl,
    onPick,
    refEl,
    hint,
    fieldKey,
  }: {
    label: string;
    currentUrl: string | null;
    onPick: (f: File) => void;
    refEl: React.RefObject<HTMLInputElement>;
    hint?: string;
    fieldKey: string;
  }) => (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="h-16 w-16 rounded-lg object-cover border" />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed bg-muted flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => refEl.current?.click()} disabled={uploadingKey === fieldKey}>
            {uploadingKey === fieldKey ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            {currentUrl ? "Trocar" : "Enviar"}
          </Button>
          {currentUrl && (
            <Button type="button" size="sm" variant="ghost" onClick={() => update(fieldKey as any, null as any)}>
              Remover
            </Button>
          )}
        </div>
        <input
          ref={refEl}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            if (refEl.current) refEl.current.value = "";
          }}
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Identidade */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Logo & Identidade</h3>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Nome da loja</label>
          <Input value={form.brand_name} onChange={(e) => update("brand_name", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Slogan curto</label>
          <Input value={form.brand_tagline} onChange={(e) => update("brand_tagline", e.target.value)} placeholder="Presentes que contam histórias" />
        </div>

        <ImageField
          label="Logo (ícone redondo — header)"
          currentUrl={form.logo_url}
          onPick={(f) => uploadImage(f, "logo_url")}
          refEl={logoRef}
          fieldKey="logo_url"
          hint="Aparece no topo do site e no painel. Quadrada é ideal."
        />

        <ImageField
          label="Logo completa (rodapé)"
          currentUrl={form.logo_full_url}
          onPick={(f) => uploadImage(f, "logo_full_url")}
          refEl={logoFullRef}
          fieldKey="logo_full_url"
          hint="Se vazio, usa a logo redonda."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1.5">WhatsApp (só números)</label>
            <Input
              value={form.whatsapp_number}
              onChange={(e) => update("whatsapp_number", e.target.value.replace(/\D/g, ""))}
              placeholder="5582999999999"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Instagram (sem @)</label>
            <Input
              value={form.instagram_handle}
              onChange={(e) => update("instagram_handle", e.target.value.replace(/@/g, ""))}
              placeholder="lojatracandomemorias"
            />
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Banner principal (hero)</h3>
        </div>

        <ImageField
          label="Imagem de fundo"
          currentUrl={form.hero_image_url}
          onPick={(f) => uploadImage(f, "hero_image_url")}
          refEl={heroRef}
          fieldKey="hero_image_url"
          hint="Imagem grande que aparece no topo da home. Proporção 16:9 recomendada."
        />

        <div>
          <label className="text-sm font-medium block mb-1.5">Linha de cima (pequeno texto)</label>
          <Input value={form.hero_eyebrow} onChange={(e) => update("hero_eyebrow", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Título principal</label>
          <Input value={form.hero_title} onChange={(e) => update("hero_title", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Subtítulo</label>
          <Textarea rows={3} value={form.hero_subtitle} onChange={(e) => update("hero_subtitle", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Texto do botão</label>
          <Input value={form.hero_cta_text} onChange={(e) => update("hero_cta_text", e.target.value)} />
        </div>
      </section>

      {/* Textos institucionais */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Textos do rodapé</h3>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1.5">Descrição "sobre" (rodapé)</label>
          <Textarea
            rows={3}
            value={form.footer_about}
            onChange={(e) => update("footer_about", e.target.value)}
          />
        </div>
      </section>

      {/* Cores */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Cores do site</h3>
        </div>
        <p className="text-xs text-muted-foreground">As mudanças aplicam em tempo real após salvar. Dê preferência a cores contrastantes para melhor leitura.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Cor primária (marca)" hslKey="primary_hsl" hint="Usada em títulos, botões e navegação." />
          <ColorField label="Texto sobre primária" hslKey="primary_foreground_hsl" hint="Texto dos botões primários." />
          <ColorField label="Cor de destaque (accent)" hslKey="accent_hsl" hint="Botão 'Ver produtos', badges." />
          <ColorField label="Fundo do site" hslKey="background_hsl" />
          <ColorField label="Cor do botão Cartão" hslKey="pay_card_hsl" />
          <ColorField label="Cor do botão Pix" hslKey="pay_pix_hsl" />
        </div>
      </section>

      {/* Fontes */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Fontes</h3>
        </div>
        <p className="text-xs text-muted-foreground">Escolha uma combinação pronta de fontes para todo o site.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FONT_OPTIONS.map((opt) => {
            const selected = form.font_heading === opt.heading && form.font_body === opt.body;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  update("font_heading", opt.heading);
                  update("font_body", opt.body);
                }}
                className={`text-left p-4 rounded-lg border-2 transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{opt.label}</div>
                <div style={{ fontFamily: `'${opt.heading}', serif` }} className="text-xl font-bold">
                  {opt.heading}
                </div>
                <div style={{ fontFamily: `'${opt.body}', sans-serif` }} className="text-sm text-muted-foreground">
                  {opt.body} · corpo de texto
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 z-10">
        <Button onClick={save} disabled={saving} className="w-full shadow-lg" size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar personalização do site"}
        </Button>
      </div>
    </div>
  );
};
