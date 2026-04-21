import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Truck, Store, MessageCircle, CreditCard, Sparkles } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { useDeliverySettings, useCampaigns } from "@/hooks/useDeliverySettings";
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

export type PaymentChoice = "pix" | "cartao";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  paymentMethod: PaymentChoice;
}

export const CheckoutDialog = ({ open, onOpenChange, onSuccess, paymentMethod }: Props) => {
  const { items, clearCart } = useCartStore();
  const { data: settings } = useDeliverySettings();
  const { data: campaigns } = useCampaigns(true);
  const pickupEnabled = settings?.pickup_enabled ?? true;
  const pickupWindow = settings?.pickup_window_text || "Retirada das 14h às 17h (combine previamente pelo WhatsApp)";
  const pickupAddress = settings?.pickup_address?.trim() || "Bairro Antares";
  const deliveryWindow = settings?.delivery_window_text || "Entregas no período da tarde (14h às 17h)";
  const pixActive = settings?.pix_discount_active ?? true;
  const pixPct = settings?.pix_discount_percent ?? 10;
  const cartMethod = items.find((i) => i.fulfillmentMethod)?.fulfillmentMethod;

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepValidated, setCepValidated] = useState<string | null>(null);
  const [method, setMethod] = useState<"entrega" | "retirada">(cartMethod || "entrega");
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_zip: "", shipping_address: "", shipping_number: "", shipping_complement: "",
    shipping_neighborhood: "", shipping_city: "", shipping_state: "", notes: "",
    recipient_name: "", recipient_phone: "", shipping_reference: "",
  });
  const [recipientType, setRecipientType] = useState<"presenteada" | "eu" | "outra">("presenteada");

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isPix = paymentMethod === "pix";
  const totalFinal = isPix && pixActive ? subtotal * (1 - pixPct / 100) : subtotal;
  const farthestDelivery = items.map((i) => i.deliveryDate).filter(Boolean).sort().pop();

  // Detecta se algum item do carrinho está vinculado a uma campanha
  const activeCampaign = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;
    for (const item of items) {
      const camp = (item as any).campaign_slug;
      if (camp) {
        const match = campaigns.find((c) => c.slug === camp);
        if (match) return match;
      }
    }
    return null;
  }, [items, campaigns]);

  const effectiveDeliveryDate = activeCampaign?.delivery_date || farthestDelivery;

  const handleCepChange = async (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "").slice(0, 8);
    const masked = onlyDigits.length > 5 ? `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}` : onlyDigits;
    set("shipping_zip", masked);
    setCepValidated(null);
    if (onlyDigits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado — confira o número");
        return;
      }
      const logradouro = (data.logradouro || "").trim();
      const bairro = (data.bairro || "").trim();
      const cidade = (data.localidade || "").trim();
      const uf = (data.uf || "").trim().toUpperCase();
      if (!cidade || !uf) {
        toast.error("CEP não retornou cidade/UF — preencha manualmente");
        return;
      }
      setForm(p => ({
        ...p,
        shipping_address: logradouro || p.shipping_address,
        shipping_neighborhood: bairro || p.shipping_neighborhood,
        shipping_city: cidade,
        shipping_state: uf,
      }));
      setCepValidated(onlyDigits);
    } catch {
      toast.error("Não consegui buscar o CEP, tente novamente");
    } finally {
      setCepLoading(false);
    }
  };

  useEffect(() => {
    if (cartMethod === "entrega" || cartMethod === "retirada") {
      setMethod(cartMethod);
    }
  }, [cartMethod]);

  const handleSubmit = async () => {
    const allComplete = items.every((i) => isPersonalizationValid(i.personalization) && !!i.deliveryDate && !!i.fulfillmentMethod);
    if (!allComplete) {
      toast.error("Itens incompletos no carrinho — preencha personalização, data e entrega/retirada no produto.");
      return;
    }
    if (cartMethod && cartMethod !== method) {
      toast.error("A forma de recebimento deve ser a mesma escolhida no produto.");
      return;
    }

    if (method === "entrega") {
      const cepDigits = form.shipping_zip.replace(/\D/g, "");
      if (cepDigits.length !== 8 || cepValidated !== cepDigits) {
        toast.error("Valide o CEP — digite os 8 dígitos e aguarde o preenchimento automático do endereço.");
        return;
      }
      if (!form.shipping_address.trim() || !form.shipping_neighborhood.trim() || !form.shipping_city.trim() || !form.shipping_state.trim()) {
        toast.error("Endereço incompleto — rua, bairro, cidade e UF são obrigatórios.");
        return;
      }
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
        total: totalFinal,
        status: 'pendente',
        payment_method: paymentMethod,
        delivery_date: effectiveDeliveryDate || null,
        delivery_method: method,
        campaign_slug: activeCampaign?.slug || null,
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
          notes: [d.notes, form.shipping_reference ? `Ponto de referência: ${form.shipping_reference}` : null]
            .filter(Boolean).join(" | ") || null,
        });
      } else {
        Object.assign(orderPayload, {
          shipping_address: `Retirada: ${pickupAddress}`,
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

      // Monta a mensagem pro WhatsApp (tanto Cartão quanto PIX)
      const itemsText = items
        .map((i) => {
          const dStr = i.deliveryDate ? format(new Date(i.deliveryDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";
          return `• *${i.name}* x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2)}\n   ✏️ ${i.personalization}\n   📅 ${dStr}`;
        })
        .join("\n\n");

      let methodBlock = "";
      if (method === "entrega") {
        const dd = d as z.infer<typeof deliverySchema>;
        methodBlock =
          `\n📍 *Forma de recebimento: Entrega*\n` +
          `${dd.shipping_address}, ${dd.shipping_number}` +
          `${dd.shipping_complement ? ` — ${dd.shipping_complement}` : ""}\n` +
          `${dd.shipping_neighborhood} • ${dd.shipping_city}/${dd.shipping_state.toUpperCase()}\n` +
          `CEP ${dd.shipping_zip}\n` +
          (form.shipping_reference ? `📌 Ponto de referência: ${form.shipping_reference}\n` : "") +
          `📨 Recebe (${recipientType === "presenteada" ? "pessoa presenteada" : recipientType === "eu" ? "eu mesmo(a)" : "outra pessoa"}): ${dd.recipient_name}${dd.recipient_phone ? ` (${dd.recipient_phone})` : ""}\n` +
          `💰 *Taxa de entrega: a partir de R$10,00* (valor final confirmado conforme bairro/região)\n`;
      } else {
        methodBlock =
          `\n🏪 *Forma de recebimento: Retirada*\n` +
          `Local: *${pickupAddress}* (endereço completo será combinado por aqui)\n` +
          `${pickupWindow}\n`;
      }

      const payLabel = isPix
        ? `💚 *Pagamento: PIX${pixActive ? ` (${pixPct}% off)` : ""}*`
        : `💳 *Pagamento: Cartão até 3x sem juros*`;

      const campaignBlock = activeCampaign
        ? `\n🌸 *Campanha: ${activeCampaign.name}*\n📅 Data especial: ${
            activeCampaign.delivery_date
              ? format(new Date(activeCampaign.delivery_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
              : "—"
          }\n${activeCampaign.note ? activeCampaign.note + "\n" : ""}`
        : "";

      const msg =
        `🛒 *Novo pedido — Loja Traçando Memórias*\n` +
        `Pedido #${order.id.slice(0, 8)}\n` +
        campaignBlock +
        `\n👤 *Cliente*\n${d.customer_name}\n📱 ${d.customer_phone}\n📧 ${d.customer_email}\n` +
        methodBlock +
        `\n🛍️ *Itens*\n${itemsText}\n` +
        `\n${payLabel}\n` +
        `💰 *Total: R$ ${totalFinal.toFixed(2)}*` +
        (method === "entrega" ? `\n(+ taxa de entrega a partir de R$10,00)` : "") +
        (d.notes ? `\n\n📝 Obs: ${d.notes}` : "") +
        (isPix
          ? `\n\nAguardo o envio da chave PIX para efetuar o pagamento. Obrigada! 💖`
          : `\n\nAguardo a confirmação da disponibilidade e o link de pagamento (cartão até 3x sem juros). Obrigada! 💖`);

      const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`;
      // Abre direto (evita bloqueio de popup em mobile)
      window.location.href = url;

      clearCart();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  };

  const title = isPix ? "Finalizar por PIX via WhatsApp" : "Finalizar por Cartão via WhatsApp";
  const subtitle = isPix
    ? `Enviaremos seu pedido pelo WhatsApp. A loja responde com a chave PIX${pixActive ? ` (${pixPct}% off)` : ""}.`
    : "Enviaremos seu pedido pelo WhatsApp. A loja confirma a disponibilidade e envia o link de pagamento (cartão até 3x sem juros).";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100%-1rem)] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {isPix ? <MessageCircle className="h-5 w-5 text-pay-pix" /> : <CreditCard className="h-5 w-5 text-pay-card" />}
            {title}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {activeCampaign && (
            <div className="bg-primary/10 border border-primary/30 rounded-md p-2.5 text-xs space-y-0.5">
              <p className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Campanha: {activeCampaign.name}
              </p>
              {activeCampaign.delivery_date && (
                <p>
                  📅 Entregas desta campanha serão realizadas em{" "}
                  <strong>
                    {format(new Date(activeCampaign.delivery_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </strong>
                </p>
              )}
              {activeCampaign.note && <p className="text-muted-foreground">{activeCampaign.note}</p>}
            </div>
          )}

          {farthestDelivery && !activeCampaign && (
            <div className="bg-muted/50 border border-border rounded-md p-2.5 text-xs">
              📅 <strong>Data prevista:</strong>{" "}
              {format(new Date(farthestDelivery + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          )}

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

            {method === "entrega" && (
              <div className="mt-2 bg-muted/50 border border-border rounded p-2.5 text-xs space-y-1">
                <p>🚚 {deliveryWindow}</p>
                <p><strong>💰 Taxa de entrega a partir de R$10,00</strong> — valor final confirmado conforme endereço, pelo WhatsApp com a loja.</p>
                <p className="text-muted-foreground">Prazo mínimo: 5 dias úteis. Horário padrão: 14h às 17h (mediante combinação prévia).</p>
              </div>
            )}

            {method === "retirada" && (
              <div className="mt-2 bg-muted/50 border border-border rounded p-2.5 text-xs space-y-1">
                <p>📍 <strong>Retirada no Bairro Antares.</strong></p>
                <p className="text-muted-foreground">O endereço completo será informado depois, pelo WhatsApp.</p>
                <p>🕐 Retiradas das <strong>14h às 17h</strong> — <strong>combine previamente</strong> com a loja pelo WhatsApp.</p>
              </div>
            )}
          </div>

          <Input placeholder="Seu nome completo *" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Seu e-mail *" type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
            <Input placeholder="Seu WhatsApp (com DDD) *" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} />
          </div>

          {method === "entrega" && (
            <>
              <div className="bg-muted border border-border rounded-md p-2.5 text-xs">
                💰 <strong>Taxa de entrega a partir de R$ 10,00</strong>, podendo variar conforme o bairro/região. O valor final é confirmado com a loja pelo WhatsApp.
              </div>

              <div className="relative">
                <Input
                  placeholder="CEP * (preenche endereço automaticamente)"
                  value={form.shipping_zip}
                  onChange={(e) => handleCepChange(e.target.value)}
                  inputMode="numeric"
                  className={
                    form.shipping_zip.replace(/\D/g, "").length === 8 && cepValidated !== form.shipping_zip.replace(/\D/g, "") && !cepLoading
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {cepLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
              </div>
              {form.shipping_zip.replace(/\D/g, "").length === 8 && cepValidated !== form.shipping_zip.replace(/\D/g, "") && !cepLoading && (
                <p className="text-[11px] text-destructive -mt-1">CEP inválido ou não localizado. Confira os 8 dígitos.</p>
              )}
              <Input placeholder="Rua / Avenida" value={form.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} />
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <Input placeholder="Nº *" value={form.shipping_number} onChange={(e) => set('shipping_number', e.target.value)} />
                <Input placeholder="Complemento (opcional)" value={form.shipping_complement} onChange={(e) => set('shipping_complement', e.target.value)} />
              </div>
              <Input placeholder="Bairro" value={form.shipping_neighborhood} onChange={(e) => set('shipping_neighborhood', e.target.value)} />
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <Input placeholder="Cidade" value={form.shipping_city} onChange={(e) => set('shipping_city', e.target.value)} />
                <Input placeholder="UF" maxLength={2} value={form.shipping_state} onChange={(e) => set('shipping_state', e.target.value.toUpperCase())} />
              </div>
              <Input placeholder="Ponto de referência (opcional)" value={form.shipping_reference} onChange={(e) => set('shipping_reference', e.target.value)} />

              <div className="bg-accent/30 border border-border rounded p-2.5 space-y-2">
                <p className="text-xs font-semibold">📨 Quem vai receber o pedido?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {([
                    { id: "presenteada", label: "A presenteada" },
                    { id: "eu", label: "Eu mesmo(a)" },
                    { id: "outra", label: "Outra pessoa" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRecipientType(opt.id);
                        if (opt.id === "eu") {
                          setForm((p) => ({
                            ...p,
                            recipient_name: p.customer_name || p.recipient_name,
                            recipient_phone: p.customer_phone || p.recipient_phone,
                          }));
                        }
                      }}
                      className={`text-xs px-3 py-2 border rounded transition-colors ${
                        recipientType === opt.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Input placeholder="Nome de quem recebe *" value={form.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} />
                <Input placeholder="WhatsApp de quem recebe (se diferente do comprador)" value={form.recipient_phone} onChange={(e) => set('recipient_phone', e.target.value)} />
              </div>
            </>
          )}

          <Textarea placeholder="Observações para a loja (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-[60px]" />

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">
              {isPix && pixActive ? `Total PIX (${pixPct}% off)` : "Total dos produtos"}
            </span>
            <span className="text-xl font-bold text-primary">R$ {totalFinal.toFixed(2)}</span>
          </div>
          {method === "entrega" && (
            <p className="text-[11px] text-muted-foreground text-right">+ taxa de entrega a partir de R$10,00 (confirmada pelo WhatsApp)</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            size="lg"
            className={`w-full ${isPix ? "bg-pay-pix text-pay-pix-foreground hover:bg-pay-pix/90" : "bg-pay-card text-pay-card-foreground hover:bg-pay-card/90"}`}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
            {loading ? "Enviando..." : isPix ? "Enviar pedido por WhatsApp (PIX)" : "Enviar pedido por WhatsApp (Cartão)"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            A cobrança é feita manualmente pela loja após confirmar a disponibilidade do produto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
