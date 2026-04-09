import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { Loader2, PackageOpen } from "lucide-react";

export const ProductGrid = () => {
  const { data: products, isLoading, error } = useProducts();

  return (
    <section id="produtos" className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Produtos
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
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

        {!isLoading && !error && products && products.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <PackageOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h3 className="font-heading text-xl font-semibold text-muted-foreground">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Em breve teremos novidades! Estamos preparando produtos especiais para você.
            </p>
          </div>
        )}

        {!isLoading && products && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
