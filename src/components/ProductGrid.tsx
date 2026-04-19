import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { Loader2, PackageOpen } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";

export const ProductGrid = () => {
  const { data: products, isLoading, error } = useProducts();
  const [searchParams] = useSearchParams();
  const cat = (searchParams.get("cat") || "").toLowerCase();
  const q = (searchParams.get("q") || "").toLowerCase();

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => {
      const name = (p.nome || p.name || "").toLowerCase();
      const category = (p.categoria || p.category || "").toLowerCase();
      const desc = (p.descricao || p.description || "").toLowerCase();
      const matchCat = !cat || cat === "todos" || category.includes(cat) || name.includes(cat);
      const matchQ = !q || name.includes(q) || desc.includes(q) || category.includes(q);
      return matchCat && matchQ;
    });
  }, [products, cat, q]);

  const filterLabel = cat && cat !== "todos" ? cat : q ? `"${q}"` : "";

  return (
    <section id="produtos" className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium">
            Coleção
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-2 mb-3 capitalize">
            {filterLabel || "Nossos Produtos"}
          </h2>
          <div className="w-12 h-0.5 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Cada peça é criada com amor e atenção aos detalhes para guardar suas memórias mais preciosas.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-destructive">
            Erro ao carregar produtos. Tente novamente mais tarde.
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h3 className="font-heading text-xl font-semibold text-muted-foreground">
              {filterLabel ? `Nenhum produto em ${filterLabel}` : "Nenhum produto encontrado"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Em breve teremos novidades! Estamos preparando produtos especiais para você.
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
