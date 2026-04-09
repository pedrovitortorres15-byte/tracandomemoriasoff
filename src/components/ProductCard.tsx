import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import type { FirebaseProduct } from "@/lib/firebase";
import { toast } from "sonner";

interface ProductCardProps {
  product: FirebaseProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const image = product.imagem || (product.imagens && product.imagens[0]);
  const secondImage = product.imagens && product.imagens.length > 1 ? product.imagens[1] : null;
  const name = product.nome || (product as any).name || "Produto";
  const price = product.preco || (product as any).price || 0;
  const originalPrice = (product as any).precoOriginal || (product as any).originalPrice;
  const description = product.descricao || (product as any).description || "";
  const category = product.categoria || (product as any).category || "";

  const installments = price > 0 ? Math.ceil(price / 3) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name,
      price,
      image: image || "",
      quantity: 1,
    });
    toast.success("Adicionado ao carrinho!", { position: "top-center" });
  };

  return (
    <Link
      to={`/produto/${product.id}`}
      className="group block rounded-lg overflow-hidden bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {image ? (
          <>
            <img
              src={image}
              alt={name}
              className={`w-full h-full object-cover transition-all duration-500 ${secondImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
              loading="lazy"
            />
            {secondImage && (
              <img
                src={secondImage}
                alt={name}
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}

        {originalPrice && originalPrice > price && (
          <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Oferta
          </span>
        )}

        <Button
          size="sm"
          onClick={handleAddToCart}
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 w-10 p-0 shadow-lg"
        >
          <ShoppingCart className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {category && (
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            {category}
          </span>
        )}
        <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {name}
        </h3>
        <div className="flex items-center gap-2 pt-1">
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-muted-foreground line-through">
              R${originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-bold text-primary">
            R${price.toFixed(2)}
          </span>
        </div>
        {installments > 0 && (
          <p className="text-xs text-muted-foreground">
            ou 3x de <span className="font-medium">R${installments.toFixed(2)}</span> sem juros
          </p>
        )}
      </div>
    </Link>
  );
};
