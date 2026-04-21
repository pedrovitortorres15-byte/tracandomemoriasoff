import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Truck, Store, MessageCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OWNER_WHATSAPP = "558287060860";

const baseSchema = {
  customer_name: z.string().trim().min(2, "Nome obrigatório").max(120),
  customer_email: z.string().trim().email("E-mail inválido").max(160),
  customer_phone: z.string().trim().min(10, "WhatsApp obrigatório (com DDD)").max(30),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
};

const deliverySchema = z.object({
  ...baseSchema,
  delivery_method: z.literal("entrega"),
  shipping_zip: z.string().trim().min(8, "CEP obrigatório").max(10),
  shipping_address: z.string().trim().min(3, "Rua obrigatória").max(160),
  shipping_number: z.string().trim().min(1, "Número obrigatório").max(20),
  shipping_complement: z.string().trim().max(80).optional().or(z.literal("")),
  shipping_neighborhood: z.string().trim().min(2, "Bairro obrigatório").max(80),
  shipping_city: z.string().trim().min(2, "Cidade obrigatória").max(80),
  shipping_state: z.string().trim().min(2, "UF obrigatória").max(2),
  recipient_name: z.string().trim().min(2, "Nome de quem recebe obrigatório").max(120),
  recipient_phone: z.string().trim().max(30).optional().or(z.literal("")),
});

const pickupSchema = z.object({
  ...baseSchema,
  delivery_method: z.literal("retirada"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CheckoutDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { items, clearCart } = useCartStore();
  const { data: settings } = useDeliverySettings();
  const pickupEnabled = settings?.pickup_enabled ?? true;
  const pickupAddress = settings?.pickup_address || "";
  const pickupWindow = settings?.pickup_window_text || "Retirada das 14h às 17h (combine previamente pelo WhatsApp)";
  const deliveryWindow = settings?.delivery_window_text || "Entregas no período da tarde (14h às 17h)";

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [method, setMethod] = useState<"entrega" | "retirada">("entrega");
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_zip: "", shipping_address: "", shipping_number: "", shipping_complement: "",
    shipping_neighborhood: "", shipping_city: "", shipping_state: "", notes: "",
    recipient_name: "", recipient_phone: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const farthestDelivery = items.map((i) => i.deliveryDate).filter(Boolean).sort().pop();

  // ViaCEP — auto-preenche endereço quando CEP tem 8 dígitos
  const handleCepChange = async (raw: string) => {
    // mantém máscara visual leve
    const onlyDigits = raw.replace(/\D/g, "").slice(0, 8);
    const masked = onlyDigits.length > 5 ? `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}` : onlyDigits;
    set("shipping_zip", masked);
    if (onlyDigits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setForm(p => ({
        ...p,
        shipping_address: data.logradouro || p.shipping_address,
        shipping_neighborhood: data.bairro || p.shipping_neighborhood,
        shipping_city: data.localidade || p.shipping_city,
        shipping_state: (data.uf || p.shipping_state).toUpperCase(),
      }));
    } catch {
      toast.error("Não consegui buscar o CEP, preencha manualmente");
    } finally {
      setCepLoading(false);
    }
  };

  const openWhatsAppShipping = () => {
    const msg = `Oi! Quero confirmar a *taxa de entrega* para o meu CEP antes de fechar o pedido.\n\nMeu CEP: ${form.shipping_zip || "(vou te passar)"}\nBairro: ${form.shipping_neighborhood || "—"}\nCidade: ${form.shipping_city || "—"}`;
    window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const openWhatsAppPickup = () => {
    const dateStr = farthestDelivery ? format(new Date(farthestDelivery + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";
    const msg = `Oi! Vou *retirar meu pedido* na loja em ${dateStr}. Quero combinar o horário (entre 14h e 17h).`;
    window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleSubmit = async () => {
    const allComplete = items.every((i) => isPersonalizationValid(i.personalization) && !!i.deliveryDate);
    if (!allComplete) {
      toast.error("Itens incompletos no carrinho — volte e preencha personalização + data de entrega.");
      return;
    }

    const schema = method === "entrega" ? deliverySchema : pickupSchema;
    const parsed = schema.safeParse({ ...form, delivery_method: method });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || "Preencha os dados corretamente");
      return;
    }
    const d = parsed.data;
    setLoading(true);
    try {
      const personalizationCombined = items
        .map((i) => {
          const dateStr = i.deliveryDate ? format(new Date(i.deliveryDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";
          return `${i.name}: ${i.personalization} [${method === "entrega" ? "Entrega" : "Retirada"}: ${dateStr}]`;
        })
        .join(" | ");

      const orderPayload: any = {
        customer_name: d.customer_name,
        customer_email: d.customer_email,
        customer_phone: d.customer_phone,
        notes: d.notes || null,
        personalization: personalizationCombined,
        total: totalPrice,
        status: 'pendente',
        payment_method: 'mercadopago',
        delivery_date: farthestDelivery || null,
        delivery_method: method,
      };
      if (method === "entrega") {
        const dd = d as z.infer<typeof deliverySchema>;
        Object.assign(orderPayload, {
          shipping_zip: dd.shipping_zip,
          shipping_address: dd.shipping_address,
          shipping_number: dd.shipping_number,
          shipping_complement: dd.shipping_complement || null,
          shipping_neighborhood: dd.shipping_neighborhood,
          shipping_city: dd.shipping_city,
          shipping_state: dd.shipping_state.toUpperCase(),
          recipient_name: dd.recipient_name,
          recipient_phone: dd.recipient_phone || null,
        });
      } else {
        Object.assign(orderPayload, {
          shipping_address: pickupAddress || "Retirada na loja",
        });
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();
      if (orderErr || !order) throw orderErr || new Error("Pedido não criado");

      const itemsPayload = items.map(i => ({
        order_id: order.id,
        product_id: i.id,
        product_name: `${i.name} — ${i.personalization || ''}`.trim(),
        quantity: i.quantity,
        unit_price: i.price,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      const { data: pay, error: payErr } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          items: items.map(i => ({
            title: `${i.name} - ${i.personalization}`.slice(0, 250),
            quantity: i.quantity,
            unit_price: i.price,
            picture_url: i.image,
          })),
          payer: { name: d.customer_name, email: d.customer_email },
          external_reference: order.id,
        },
      });
      if (payErr) throw payErr;
      if (!pay?.init_point) throw new Error("Falha ao iniciar pagamento");

      // Notificação no WhatsApp da dona — TAMBÉM para cartão
      try {
        const itemsText = items
          .map((i) => `• ${i.name} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2)}\n  Personalização: ${i.personalization}`)
          .join("\n");
        const dateStr = farthestDelivery ? format(new Date(farthestDelivery + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";

        let methodBlock = "";
        if (method === "entrega") {
          const dd = d as z.infer<typeof deliverySchema>;
          methodBlock =
            `\n📍 *Entrega em ${dateStr}*\n` +
            `${dd.shipping_address}, ${dd.shipping_number}` +
            `${dd.shipping_complement ? ` — ${dd.shipping_complement}` : ""}\n` +
            `${dd.shipping_neighborhood}\n` +
            `${dd.shipping_city}/${dd.shipping_state.toUpperCase()} • CEP ${dd.shipping_zip}\n` +
            `\n📨 Recebe: ${dd.recipient_name}${dd.recipient_phone ? ` (${dd.recipient_phone})` : ""}\n` +
            `\n⚠️ *Taxa de entrega a combinar pelo WhatsApp com o cliente*\n`;
        } else {
          methodBlock =
            `\n🏪 *Retirada em ${dateStr}*\n` +
            `${pickupAddress || "—"}\n${pickupWindow}\n` +
            `\n⚠️ *Cliente vai combinar horário pelo WhatsApp*\n`;
        }

        const ownerMsg =
          `🛒 *NOVO PEDIDO — Loja Traçando Memórias*\n` +
          `\n💳 Pagamento: Cartão (Mercado Pago)\n` +
          `📦 Pedido: ${order.id.slice(0, 8)}\n` +
          `\n👤 *Cliente*\n${d.customer_name}\n` +
          `📱 ${d.customer_phone}\n` +
          `📧 ${d.customer_email}\n` +
          methodBlock +
          `\n🛍️ *Itens*\n${itemsText}\n` +
          `\n💰 Subtotal produtos: R$ ${totalPrice.toFixed(2)}` +
          (d.notes ? `\n\n📝 Obs: ${d.notes}` : "");
        window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(ownerMsg)}`, "_blank");
      } catch (notifyErr) {
        console.warn("Falha ao abrir WhatsApp da dona:", notifyErr);
      }

      clearCart();
      onSuccess();
      window.location.href = pay.init_point;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Finalizar Pedido</DialogTitle>
          <DialogDescription>Pagamento seguro pelo Mercado Pago — parcelamento sem juros conforme configurado pela loja</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {farthestDelivery && (
            <div className="bg-primary/10 border border-primary/30 rounded-md p-2.5 text-xs">
              📅 <strong>Data prevista:</strong>{" "}
              {format(new Date(farthestDelivery + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          )}

          {/* Forma de recebimento */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">Como deseja receber?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMethod("entrega")}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded text-sm transition-colors ${method === "entrega" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}>
                <Truck className="h-4 w-4" /> Entrega
              </button>
              <button type="button" onClick={() => pickupEnabled && setMethod("retirada")} disabled={!pickupEnabled}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${method === "retirada" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary"}`}>
                <Store className="h-4 w-4" /> Retirada
              </button>
            </div>

            {/* Aviso entrega */}
            {method === "entrega" && (
              <div className="mt-2 bg-muted/50 border border-border rounded p-2.5 text-xs space-y-1.5">
                <p>🚚 {deliveryWindow}</p>
                <p className="text-foreground">
                  💰 <strong>A taxa de entrega varia por bairro</strong> e deve ser combinada com a loja pelo WhatsApp.
                </p>
                <button type="button" onClick={openWhatsAppShipping}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                  <MessageCircle className="h-3 w-3" /> Consultar taxa pelo WhatsApp
                </button>
              </div>
            )}

            {/* Aviso retirada */}
            {method === "retirada" && (
              <div className="mt-2 bg-muted/50 border border-border rounded p-2.5 text-xs space-y-1.5">
                {pickupAddress && <p>📍 <strong>Endereço:</strong> {pickupAddress}</p>}
                <p>🕐 Retirada das <strong>14h às 17h</strong>, mas é necessário <strong>combinar previamente</strong> com a loja pelo WhatsApp.</p>
                {farthestDelivery && (
                  <p>📅 Sua data de retirada: <strong>{format(new Date(farthestDelivery + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</strong></p>
                )}
                <button type="button" onClick={openWhatsAppPickup}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                  <MessageCircle className="h-3 w-3" /> Combinar horário pelo WhatsApp
                </button>
              </div>
            )}
          </div>

          <Input placeholder="Seu nome completo *" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Seu e-mail *" type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
            <Input placeholder="Seu WhatsApp (DDD) *" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} />
          </div>

          {method === "entrega" && (
            <>
              <div className="relative">
                <Input
                  placeholder="CEP * (preenche endereço automaticamente)"
                  value={form.shipping_zip}
                  onChange={(e) => handleCepChange(e.target.value)}
                  inputMode="numeric"
                />
                {cepLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
              </div>
              <Input placeholder="Rua / Avenida (preenchido pelo CEP)" value={form.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} />
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <Input placeholder="Nº *" value={form.shipping_number} onChange={(e) => set('shipping_number', e.target.value)} />
                <Input placeholder="Complemento (opcional)" value={form.shipping_complement} onChange={(e) => set('shipping_complement', e.target.value)} />
              </div>
              <Input placeholder="Bairro" value={form.shipping_neighborhood} onChange={(e) => set('shipping_neighborhood', e.target.value)} />
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <Input placeholder="Cidade" value={form.shipping_city} onChange={(e) => set('shipping_city', e.target.value)} />
                <Input placeholder="UF" maxLength={2} value={form.shipping_state} onChange={(e) => set('shipping_state', e.target.value.toUpperCase())} />
              </div>

              <div className="bg-accent/30 border border-border rounded p-2.5 space-y-2">
                <p className="text-xs font-semibold">📨 Quem vai receber o pedido?</p>
                <Input placeholder="Nome de quem recebe *" value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} />
                <Input placeholder="WhatsApp de quem recebe (opcional)" value={form.recipient_phone} onChange={(e) => set('recipient_phone', e.target.value)} />
              </div>
            </>
          )}

          <Textarea placeholder="Observações para a loja (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-[60px]" />

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total dos produtos</span>
            <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
          </div>
          {method === "entrega" && (
            <p className="text-[11px] text-muted-foreground text-right">+ taxa de entrega a combinar pelo WhatsApp</p>
          )}
          <p className="text-xs text-muted-foreground text-right">
            Parcelamento sem juros no cartão conforme configuração da loja no Mercado Pago
          </p>

          <Button onClick={handleSubmit} disabled={loading} size="lg" className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {loading ? 'Processando...' : 'Pagar com Mercado Pago'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Seus dados são criptografados. O pagamento acontece dentro do Mercado Pago.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
