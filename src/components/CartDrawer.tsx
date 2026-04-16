import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, MessageCircle, Loader2, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { items, updateQuantity, updatePersonalization, removeItem, allPersonalized } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const canCheckout = allPersonalized();

  const handleWhatsAppCheckout = () => {
    if (!canCheckout) {
      toast.error("Preencha a personalização de todos os itens!");
      return;
    }
    const message = items.map(i =>
      `• ${i.name} (x${i.quantity}) - R$ ${(i.price * i.quantity).toFixed(2)}\n  Personalização: ${i.personalization}`
    ).join('\n');
    const text = `Olá! Gostaria de fazer o seguinte pedido:\n\n${message}\n\nTotal: R$ ${totalPrice.toFixed(2)}`;
    window.open(`https://wa.me/558287060860?text=${encodeURIComponent(text)}`, '_blank');
    setIsOpen(false);
  };

  const handleMercadoPagoCheckout = async () => {
    if (!canCheckout) {
      toast.error("Preencha a personalização de todos os itens!");
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          items: items.map(item => ({
            title: `${item.name} - ${item.personalization}`,
            quantity: item.quantity,
            unit_price: item.price,
            picture_url: item.image,
          })),
        },
      });
      if (error) throw error;
      if (data?.init_point) {
        window.open(data.init_point, '_blank');
        setIsOpen(false);
      } else {
        throw new Error('Erro ao gerar link de pagamento');
      }
    } catch (err: any) {
      console.error('Mercado Pago error:', err);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="font-heading">Carrinho</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Seu carrinho está vazio" : `${totalItems} ite${totalItems !== 1 ? 'ns' : 'm'} no carrinho`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="font-semibold text-sm text-primary">R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium flex items-center gap-1 mb-1">
                          ✨ Personalização <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          placeholder="Ex: Nome 'Maria', cor rosa, com foto..."
                          value={item.personalization || ""}
                          onChange={(e) => updatePersonalization(item.id, e.target.value)}
                          className="text-xs min-h-[60px] resize-none"
                        />
                        {(!item.personalization || !item.personalization.trim()) && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" /> Obrigatório para finalizar
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-3 pt-4 border-t">
                {!canCheckout && (
                  <p className="text-xs text-destructive text-center font-medium">
                    ⚠️ Preencha a personalização de todos os itens para finalizar
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
                </div>
                <Button
                  onClick={handleMercadoPagoCheckout}
                  className="w-full bg-[hsl(210,80%,50%)] hover:bg-[hsl(210,80%,45%)] text-[hsl(0,0%,100%)]"
                  size="lg"
                  disabled={!canCheckout || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  {isProcessing ? 'Processando...' : 'Pagar com Mercado Pago'}
                </Button>
                <Button
                  onClick={handleWhatsAppCheckout}
                  variant="outline"
                  className="w-full border-[hsl(140,60%,35%)] text-[hsl(140,60%,30%)] hover:bg-[hsl(140,60%,95%)]"
                  size="lg"
                  disabled={!canCheckout}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Pedir pelo WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
