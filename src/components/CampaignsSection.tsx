import { Link } from "react-router-dom";
import { useCampaigns } from "@/hooks/useDeliverySettings";
import { Sparkles, ArrowRight, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const CampaignsSection = () => {
  const { data: campaigns, isLoading } = useCampaigns(true);

  if (isLoading || !campaigns || campaigns.length === 0) return null;

  return (
    <section id="campanhas" className="py-12 md:py-20 bg-gradient-to-br from-primary/5 via-accent/10 to-background">
      <div className="container">
        <div className="text-center mb-8 md:mb-10 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.3em] text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Especiais da loja
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mt-2 mb-3">
            Datas e coleções para presentear
          </h2>
          <div className="w-12 h-0.5 bg-primary mx-auto mb-3 rounded-full" />
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Selecionamos peças exclusivas para cada momento especial. Toque em um especial para ver os produtos disponíveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              to={`/campanha/${c.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 md:p-6 shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors" />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Especial
                </div>
                <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight">
                  {c.name}
                </h3>
                {c.delivery_date && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Entrega em{" "}
                    <strong className="text-foreground">
                      {format(new Date(c.delivery_date + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                    </strong>
                  </p>
                )}
                {c.note && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.note}</p>
                )}
                <div className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all pt-1">
                  Ver produtos <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
