import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CalendarDays, ArrowLeft, PackageOpen } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  delivery_date: string | null;
  active: boolean;
  note: string | null;
}

const useCampaign = (slug?: string) =>
  useQuery({
    queryKey: ["campaign", slug],
    enabled: !!slug,
    queryFn: async (): Promise<CampaignRow | null> => {
      const { data, error } = await (supabase as any)
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as CampaignRow) || null;
    },
  });

const useCampaignProducts = (slug?: string) =>
  useQuery({
    queryKey: ["campaign-products", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,image_url,media_urls,video_url,category,active,stock,campaign_slug")
        .eq("active", true)
        .eq("campaign_slug", slug as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        nome: p.name,
        descricao: p.description || "",
        preco: Number(p.price),
        imagem: (p.media_urls && p.media_urls[0]) || p.image_url || "",
        imagens: p.media_urls?.length ? p.media_urls : p.image_url ? [p.image_url] : [],
        videoUrl: p.video_url || "",
        categoria: p.category || "",
        ativo: p.active,
        estoque: p.stock,
      }));
    },
  });

export default function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaign, isLoading: loadingCamp } = useCampaign(slug);
  const { data: products, isLoading: loadingProds } = useCampaignProducts(slug);

  useEffect(() => {
    if (campaign?.name) {
      document.title = `${campaign.name} — Loja Traçando Memórias`;
    }
  }, [campaign?.name]);

  const formattedDate = useMemo(
    () =>
      campaign?.delivery_date
        ? format(new Date(campaign.delivery_date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : null,
    [campaign?.delivery_date]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/10 via-accent/15 to-background py-10 md:py-16">
          <div className="container">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar para a loja
            </Link>

            {loadingCamp ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando campanha…
              </div>
            ) : !campaign ? (
              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-bold">Campanha não encontrada</h1>
                <p className="text-muted-foreground">Verifique o link ou volte para a página inicial.</p>
                <Button asChild>
                  <Link to="/">Ver todas as campanhas</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center gap-3">
                  <BrandLogo variant="icon" className="h-12 w-12 md:h-14 md:w-14" />
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Campanha Especial
                  </div>
                </div>
                <h1 className="font-heading text-3xl md:text-5xl font-bold text-foreground leading-tight">
                  {campaign.name}
                </h1>
                {formattedDate && (
                  <p className="flex items-center gap-2 text-sm md:text-base text-muted-foreground">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Entregas previstas para <strong className="text-foreground">{formattedDate}</strong>
                  </p>
                )}
                {campaign.note && (
                  <p className="text-sm md:text-base text-muted-foreground bg-card border border-border rounded-lg p-3 md:p-4">
                    {campaign.note}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="container">
            {loadingProds && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!loadingProds && products && products.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <h3 className="font-heading text-xl font-semibold text-muted-foreground">
                  Nenhum produto nesta campanha por enquanto
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Em breve novidades especiais aqui. Enquanto isso, explore os outros produtos da loja.
                </p>
                <Button asChild>
                  <Link to="/">Ver todos os produtos</Link>
                </Button>
              </div>
            )}

            {!loadingProds && products && products.length > 0 && (
              <>
                <div className="text-center mb-8">
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium">
                    Coleção da campanha
                  </span>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-2">
                    {products.length} {products.length === 1 ? "produto disponível" : "produtos disponíveis"}
                  </h2>
                  <div className="w-12 h-0.5 bg-primary mx-auto mt-3 rounded-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
