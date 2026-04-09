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
  const name = product.nome || (product as any).name || "Produto";
  const price = product.preco || (product as any).price || 0;
  const description = product.descricao || (product as any).description || "";

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
      className="group block rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-primary">
            R$ {price.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
};
