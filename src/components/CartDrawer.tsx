import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { toast } from "sonner";
import { CheckoutDialog } from "./CheckoutDialog";
import { DeliveryDatePicker } from "./DeliveryDatePicker";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, updateQuantity, updatePersonalization, updateDeliveryDate, removeItem, allValid, invalidReason } = useCartStore();
  const { data: settings } = useDeliverySettings();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const pixActive = settings?.pix_discount_active ?? true;
  const pixPct = settings?.pix_discount_percent ?? 10;
  const pixPrice = pixActive ? totalPrice * (1 - pixPct / 100) : totalPrice;
  const canCheckout = allValid();
  const blockReason = invalidReason();

  const handleWhatsAppCheckout = () => {
    if (!canCheckout) {
      toast.error(blockReason || "Complete os dados de cada item");
      return;
    }
    const message = items.map(i => {
      const dateStr = i.deliveryDate
        ? format(new Date(i.deliveryDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
        : "—";
      return `• ${i.name} (x${i.quantity}) - R$ ${(i.price * i.quantity).toFixed(2)}\n  Personalização: ${i.personalization}\n  Entrega: ${dateStr}`;
    }).join('\n\n');
    const text = `Olá Loja Traçando Memórias! Gostaria de fazer o seguinte pedido (PIX com ${pixPct}% off):\n\n${message}\n\nTotal PIX: R$ ${pixPrice.toFixed(2)}`;
    window.open(`https://wa.me/558287060860?text=${encodeURIComponent(text)}`, '_blank');
    setIsOpen(false);
  };

  const handleStartCheckout = () => {
    if (!canCheckout) {
      toast.error(blockReason || "Complete os dados de cada item");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full" aria-label="Carrinho">
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
          <SheetTitle className="font-heading">Carrinho — Loja Traçando Memórias</SheetTitle>
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
                  {items.map((item) => {
                    const persOk = isPersonalizationValid(item.personalization);
                    const dateOk = !!item.deliveryDate;
                    const itemComplete = persOk && dateOk;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg space-y-3 border ${itemComplete ? 'bg-muted/40 border-border' : 'bg-destructive/5 border-destructive/40'}`}
                      >
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                            {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate flex items-center gap-1.5">
                              {item.name}
                              {itemComplete && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />}
                            </h4>
                            <p className="font-semibold text-sm text-primary">R$ {item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.id)} aria-label="Remover">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuir">
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Aumentar">
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
                            placeholder="Ex: Nome 'Maria Eduarda', cor rosa chá, foto da Júlia em anexo no WhatsApp..."
                            value={item.personalization || ""}
                            onChange={(e) => updatePersonalization(item.id, e.target.value)}
                            className="text-xs min-h-[70px] resize-none"
                            maxLength={500}
                          />
                          {!persOk && (
                            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" /> Mínimo 5 caracteres reais (não vale ".", " ", letras soltas)
                            </p>
                          )}
                        </div>

                        <DeliveryDatePicker
                          value={item.deliveryDate ? new Date(item.deliveryDate + "T12:00:00") : undefined}
                          onChange={(d) => d && updateDeliveryDate(item.id, d.toISOString().slice(0, 10))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-3 pt-4 border-t">
                {!canCheckout && blockReason && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2.5">
                    <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {blockReason}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  {pixActive && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-700 font-medium">PIX ({pixPct}% off)</span>
                      <span className="font-bold text-green-700">R$ {pixPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-base font-semibold">Total cartão</span>
                    <span className="text-lg font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">3x sem juros no cartão</p>
                </div>
                <Button
                  onClick={handleStartCheckout}
                  className="w-full bg-[hsl(210,80%,50%)] hover:bg-[hsl(210,80%,45%)] text-[hsl(0,0%,100%)]"
                  size="lg"
                  disabled={!canCheckout}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar Cartão (3x sem juros) — R$ {totalPrice.toFixed(2)}
                </Button>
                <Button
                  onClick={handleWhatsAppCheckout}
                  className="w-full bg-[hsl(140,60%,38%)] hover:bg-[hsl(140,60%,33%)] text-white"
                  size="lg"
                  disabled={!canCheckout}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> PIX via WhatsApp — R$ {pixPrice.toFixed(2)}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    <CheckoutDialog
      open={checkoutOpen}
      onOpenChange={setCheckoutOpen}
      onSuccess={() => { setCheckoutOpen(false); setIsOpen(false); }}
    />
    </>
  );
};
