import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Nome obrigatório").max(120),
  customer_email: z.string().trim().email("E-mail inválido").max(160),
  customer_phone: z.string().trim().min(10, "WhatsApp obrigatório (com DDD)").max(30),
  shipping_zip: z.string().trim().min(8, "CEP obrigatório").max(10),
  shipping_address: z.string().trim().min(3, "Rua obrigatória").max(160),
  shipping_number: z.string().trim().min(1, "Número obrigatório").max(20),
  shipping_complement: z.string().trim().max(80).optional().or(z.literal("")),
  shipping_neighborhood: z.string().trim().min(2, "Bairro obrigatório").max(80),
  shipping_city: z.string().trim().min(2, "Cidade obrigatória").max(80),
  shipping_state: z.string().trim().min(2, "UF obrigatória").max(2),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CheckoutDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_zip: "", shipping_address: "", shipping_number: "", shipping_complement: "",
    shipping_neighborhood: "", shipping_city: "", shipping_state: "", notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  // Pega a data de entrega mais TARDE entre os itens (pedido só sai quando o último estiver pronto)
  const farthestDelivery = items
    .map((i) => i.deliveryDate)
    .filter(Boolean)
    .sort()
    .pop();

  const handleSubmit = async () => {
    // Backend-side guarantee: re-validate personalization & date
    const allComplete = items.every((i) => isPersonalizationValid(i.personalization) && !!i.deliveryDate);
    if (!allComplete) {
      toast.error("Itens incompletos no carrinho — volte e preencha personalização + data de entrega.");
      return;
    }
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || "Preencha os dados corretamente");
      return;
    }
    setLoading(true);
    try {
      const personalizationCombined = items
        .map((i) => {
          const dateStr = i.deliveryDate
            ? format(new Date(i.deliveryDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
            : "—";
          return `${i.name}: ${i.personalization} [Entrega: ${dateStr}]`;
        })
        .join(" | ");

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_name: parsed.data.customer_name,
          customer_email: parsed.data.customer_email,
          customer_phone: parsed.data.customer_phone,
          shipping_zip: parsed.data.shipping_zip,
          shipping_address: parsed.data.shipping_address,
          shipping_number: parsed.data.shipping_number,
          shipping_complement: parsed.data.shipping_complement || null,
          shipping_neighborhood: parsed.data.shipping_neighborhood,
          shipping_city: parsed.data.shipping_city,
          shipping_state: parsed.data.shipping_state.toUpperCase(),
          notes: parsed.data.notes || null,
          personalization: personalizationCombined,
          total: totalPrice,
          status: 'pendente',
          payment_method: 'mercadopago',
          delivery_date: farthestDelivery || null,
        } as any)
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
          payer: {
            name: parsed.data.customer_name,
            email: parsed.data.customer_email,
          },
          external_reference: order.id,
          installments: 3,
        },
      });
      if (payErr) throw payErr;
      if (!pay?.init_point) throw new Error("Falha ao iniciar pagamento");

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
          <DialogTitle className="font-heading">Dados de Entrega</DialogTitle>
          <DialogDescription>Pagamento seguro pelo Mercado Pago — cartão em até 3x sem juros</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {farthestDelivery && (
            <div className="bg-primary/10 border border-primary/30 rounded-md p-2.5 text-xs">
              📅 <strong>Entrega prevista:</strong>{" "}
              {format(new Date(farthestDelivery + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          )}
          <Input placeholder="Nome completo *" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="E-mail *" type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
            <Input placeholder="WhatsApp com DDD *" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} />
          </div>
          <Input placeholder="CEP *" value={form.shipping_zip} onChange={(e) => set('shipping_zip', e.target.value)} />
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Input placeholder="Rua / Avenida *" value={form.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} />
            <Input placeholder="Nº *" value={form.shipping_number} onChange={(e) => set('shipping_number', e.target.value)} />
          </div>
          <Input placeholder="Complemento (opcional)" value={form.shipping_complement} onChange={(e) => set('shipping_complement', e.target.value)} />
          <Input placeholder="Bairro *" value={form.shipping_neighborhood} onChange={(e) => set('shipping_neighborhood', e.target.value)} />
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <Input placeholder="Cidade *" value={form.shipping_city} onChange={(e) => set('shipping_city', e.target.value)} />
            <Input placeholder="UF *" maxLength={2} value={form.shipping_state} onChange={(e) => set('shipping_state', e.target.value.toUpperCase())} />
          </div>
          <Textarea placeholder="Observações para a dona (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="min-h-[60px]" />

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total cartão</span>
            <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            ou 3x de R$ {(totalPrice / 3).toFixed(2)} sem juros
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
