import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, MessageCircle, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { toast } from "sonner";
import { CheckoutDialog, type PaymentChoice } from "./CheckoutDialog";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { BrandLogo } from "./BrandLogo";

export const CartDrawer = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("pix");
  const { items, updateQuantity, removeItem, allValid, invalidReason } = useCartStore();
  const { data: settings } = useDeliverySettings();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const pixActive = settings?.pix_discount_active ?? true;
  const pixPct = settings?.pix_discount_percent ?? 10;
  const pixPrice = pixActive ? totalPrice * (1 - pixPct / 100) : totalPrice;
  const canCheckout = allValid();
  const blockReason = invalidReason();

  const openCheckout = (choice: PaymentChoice) => {
    if (!canCheckout) {
      toast.error(blockReason || "Complete os dados de cada item");
      return;
    }
    setPaymentChoice(choice);
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
          <SheetTitle className="font-heading flex items-center gap-2.5">
            <BrandLogo variant="icon" className="h-9 w-9" />
            <span>Carrinho — Loja Traçando Memórias</span>
          </SheetTitle>
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
                    const methodOk = !!item.fulfillmentMethod;
                    const itemComplete = persOk && dateOk && methodOk;
                    const personalizationParts = (item.personalization || "")
                      .split(" | ")
                      .map((p) => p.trim())
                      .filter(Boolean);
                    const goEdit = () => {
                      setIsOpen(false);
                      navigate(`/produto/${item.id}`);
                    };
                    return (
                      <div
                        key={item.id + (item.personalization || "") + (item.deliveryDate || "")}
                        className={`p-3 rounded-lg space-y-3 border ${itemComplete ? 'bg-muted/40 border-border' : 'bg-destructive/5 border-destructive/40'}`}
                      >
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                            {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate flex items-center gap-1.5">
                              {item.name}
                              {itemComplete && <CheckCircle2 className="h-3.5 w-3.5 text-pay-pix flex-shrink-0" />}
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

                        <div className="rounded-md bg-background border border-border p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              ✨ Personalização
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={goEdit}>
                              <Pencil className="h-3 w-3" /> Editar
                            </Button>
                          </div>
                          {personalizationParts.length > 0 ? (
                            <ul className="space-y-1 text-xs text-foreground">
                              {personalizationParts.map((line, idx) => {
                                const [k, ...rest] = line.split(":");
                                const v = rest.join(":").trim();
                                return v ? (
                                  <li key={idx} className="flex gap-1.5">
                                    <span className="text-muted-foreground font-medium">{k.trim()}:</span>
                                    <span className="flex-1 break-words">{v}</span>
                                  </li>
                                ) : (
                                  <li key={idx} className="text-xs">{line}</li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Nenhuma personalização preenchida.</p>
                          )}
                          {!itemComplete && (
                            <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              Personalização incompleta — clique em <strong>Editar</strong> para finalizar.
                            </p>
                          )}
                        </div>
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
                      <span className="text-pay-pix font-medium">PIX ({pixPct}% off)</span>
                      <span className="font-bold text-pay-pix">R$ {pixPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-base font-semibold">Total cartão</span>
                    <span className="text-lg font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">A dona envia o link de pagamento por WhatsApp (cartão até 3x sem juros)</p>
                </div>
                <Button
                  onClick={() => openCheckout("cartao")}
                  className="w-full bg-pay-card text-pay-card-foreground hover:bg-pay-card/90"
                  size="lg"
                  disabled={!canCheckout}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Cartão via WhatsApp — R$ {totalPrice.toFixed(2)}
                </Button>
                <Button
                  onClick={() => openCheckout("pix")}
                  className="w-full bg-pay-pix text-pay-pix-foreground hover:bg-pay-pix/90"
                  size="lg"
                  disabled={!canCheckout}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> PIX via WhatsApp — R$ {pixPrice.toFixed(2)}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Todos os pedidos são confirmados manualmente pela loja antes da cobrança.
                </p>
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
      paymentMethod={paymentChoice}
    />
    </>
  );
};
