import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCartStore, isPersonalizationValid } from "@/stores/cartStore";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { DeliveryDatePicker } from "@/components/DeliveryDatePicker";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShoppingCart, Minus, Plus, ChevronRight, ChevronLeft, Upload, Check, AlertCircle } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { readCustomFields, toSteps, calcAddonTotal } from "@/lib/customFields";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const addItem = useCartStore(state => state.addItem);
  const { data: settings } = useDeliverySettings();
  const pixActive = settings?.pix_discount_active ?? true;
  const pixPct = settings?.pix_discount_percent ?? 10;
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [personalization, setPersonalization] = useState<Record<string, string | string[]>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({});
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['supabase-product', handle],
    queryFn: async (): Promise<any> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', handle!)
        .single();
      if (error || !data) return null;
      const d: any = data;
      return {
        id: d.id,
        nome: d.name,
        descricao: d.description || '',
        preco: d.price,
        imagem: (d.media_urls && d.media_urls[0]) || d.image_url || '',
        imagens: d.media_urls && d.media_urls.length > 0 ? d.media_urls : (d.image_url ? [d.image_url] : []),
        categoria: d.category || '',
        ativo: d.active,
        estoque: d.stock,
        custom_fields: d.custom_fields || [],
      };
    },
    enabled: !!handle,
  });

  const name = product?.nome || "";
  const basePrice = Number(product?.preco || 0);
  const description = product?.descricao || "";
  const images: string[] = product?.imagens || [];

  const customFields = useMemo(() => readCustomFields(product), [product]);
  const steps = useMemo(() => toSteps(customFields), [customFields]);

  const addonTotal = useMemo(() => calcAddonTotal(customFields, personalization), [customFields, personalization]);
  const unitPrice = basePrice + addonTotal;
  const installments = unitPrice > 0 ? unitPrice / 3 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="font-heading text-2xl font-bold text-foreground">Produto não encontrado</h2>
            <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
          </div>
        </div>
      </div>
    );
  }

  const validatePersonalization = (): { ok: boolean; reason?: string } => {
    for (const s of steps) {
      if (!s.required) continue;
      const v = personalization[s.id];
      if (s.type === "multiselect" || s.type === "addon") {
        if (!Array.isArray(v) || v.length === 0) return { ok: false, reason: `Selecione "${s.title}"` };
      } else if (s.type === "file") {
        if (!uploadedFiles[s.id]) return { ok: false, reason: `Envie a imagem em "${s.title}"` };
      } else {
        const str = typeof v === "string" ? v : "";
        if (!str.trim()) return { ok: false, reason: `Preencha "${s.title}"` };
        if ((s.type === "text" || s.type === "textarea") && !isPersonalizationValid(str)) {
          return { ok: false, reason: `"${s.title}" precisa de pelo menos 5 caracteres reais` };
        }
      }
    }
    if (!deliveryDate) return { ok: false, reason: "Escolha a data de entrega" };
    return { ok: true };
  };

  const buildPersonalizationSummary = (): string => {
    const parts = steps
      .map((s) => {
        const v = personalization[s.id];
        if (!v || (Array.isArray(v) && v.length === 0)) return null;
        const text = Array.isArray(v) ? v.join(", ") : v;
        return `${s.title}: ${text}`;
      })
      .filter(Boolean) as string[];
    if (deliveryDate) parts.push(`Entrega: ${format(deliveryDate, "dd/MM/yyyy", { locale: ptBR })}`);
    return parts.join(" | ");
  };

  const handleAddToCart = () => {
    const v = validatePersonalization();
    if (!v.ok) { toast.error(v.reason || "Complete a personalização"); return; }
    addItem({
      id: product.id,
      name,
      price: unitPrice,
      image: images[0] || "",
      quantity,
      personalization: buildPersonalizationSummary(),
      deliveryDate: deliveryDate ? deliveryDate.toISOString().slice(0, 10) : undefined,
    });
    toast.success("Adicionado ao carrinho!", { position: "top-center" });
  };

  const handleFileChange = (stepId: string, file: File | null) => {
    setUploadedFiles(prev => ({ ...prev, [stepId]: file }));
  };

  const handleWhatsAppOrder = (payment: "pix" | "cartao") => {
    const v = validatePersonalization();
    if (!v.ok) { toast.error(v.reason || "Complete a personalização"); return; }
    const subtotal = unitPrice * quantity;
    const finalPrice = payment === "pix" && pixActive ? subtotal * (1 - pixPct / 100) : subtotal;
    const payLabel = payment === "pix"
      ? `💚 *Pagamento: PIX${pixActive ? ` (${pixPct}% off)` : ""}*`
      : `💳 *Pagamento: Cartão até 3x sem juros*`;

    let text = `Olá Loja Traçando Memórias! Gostaria de fazer um pedido:\n\n`;
    text += `📦 *${name}* (x${quantity})\n`;
    text += `💰 Subtotal: R$ ${subtotal.toFixed(2)}\n`;
    text += `📅 Data desejada: ${deliveryDate ? format(deliveryDate, "dd/MM/yyyy", { locale: ptBR }) : "—"}\n\n`;
    text += `✏️ *Personalização:*\n`;
    Object.entries(personalization).forEach(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return;
      const step = steps.find(s => s.id === key);
      const txt = Array.isArray(value) ? value.join(", ") : value;
      text += `• ${step?.title || key}: ${txt}\n`;
    });
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      if (file) {
        const step = steps.find(s => s.id === key);
        text += `• ${step?.title || key}: (foto anexada separadamente)\n`;
      }
    });
    text += `\n${payLabel}\n`;
    text += `💰 *Total: R$ ${finalPrice.toFixed(2)}*\n\n`;
    text += payment === "pix"
      ? `Aguardo a chave PIX para efetuar o pagamento. Obrigada! 💖`
      : `Aguardo a confirmação da disponibilidade e o link de pagamento (cartão até 3x sem juros). Obrigada! 💖`;
    window.location.href = `https://wa.me/558287060860?text=${encodeURIComponent(text)}`;
  };

  const isLastStep = currentStep === steps.length - 1;
  const validationCheck = validatePersonalization();
  const currentField = steps[currentStep];

  const toggleMulti = (fieldId: string, label: string) => {
    setPersonalization((prev) => {
      const arr = Array.isArray(prev[fieldId]) ? [...(prev[fieldId] as string[])] : [];
      const i = arr.indexOf(label);
      if (i >= 0) arr.splice(i, 1); else arr.push(label);
      return { ...prev, [fieldId]: arr };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-10">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex gap-3">
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2 w-16 flex-shrink-0">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`w-16 h-20 rounded overflow-hidden border-2 transition-colors flex-shrink-0 ${i === selectedImage ? 'border-primary' : 'border-transparent hover:border-border'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1">
                <div className="aspect-[3/4] rounded overflow-hidden bg-muted">
                  {images[selectedImage] ? (
                    <img src={images[selectedImage]} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem imagem</div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 md:hidden overflow-x-auto">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setSelectedImage(i)}
                        className={`w-14 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${i === selectedImage ? 'border-primary' : 'border-transparent'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide mb-3">{name}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">R${unitPrice.toFixed(2)}</span>
                  {addonTotal > 0 && (
                    <span className="text-xs text-muted-foreground">(+R${addonTotal.toFixed(2)} em adicionais)</span>
                  )}
                </div>
                {installments > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou 3x de <span className="font-medium">R${installments.toFixed(2)}</span> sem juros
                  </p>
                )}
              </div>

              <div className="w-full h-px bg-border" />

              {description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">O que vem!?</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
              )}

              {steps.length > 0 && currentField && (
                <div className="bg-cream-50 border border-border rounded-lg p-5 space-y-5">
                  <h3 className="font-heading text-lg font-semibold text-foreground">Personalização</h3>

                  <div className="flex items-center gap-1">
                    {steps.map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                      {currentField.title}
                      {!currentField.required && <span className="text-[10px] text-muted-foreground normal-case font-normal">(opcional)</span>}
                    </label>
                    {currentField.description && (
                      <p className="text-xs text-muted-foreground">{currentField.description}</p>
                    )}

                    {currentField.type === 'text' && (
                      <input
                        type="text"
                        value={(personalization[currentField.id] as string) || ''}
                        onChange={(e) => setPersonalization(prev => ({ ...prev, [currentField.id]: e.target.value }))}
                        placeholder={currentField.placeholder}
                        className="w-full px-4 py-2.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    )}

                    {currentField.type === 'textarea' && (
                      <textarea
                        value={(personalization[currentField.id] as string) || ''}
                        onChange={(e) => setPersonalization(prev => ({ ...prev, [currentField.id]: e.target.value }))}
                        placeholder={currentField.placeholder}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    )}

                    {currentField.type === 'select' && currentField.options && (
                      <div className="grid grid-cols-2 gap-2">
                        {currentField.options.map((opt) => (
                          <button key={opt.label}
                            onClick={() => setPersonalization(prev => ({ ...prev, [currentField.id]: opt.label }))}
                            className={`px-3 py-2 text-sm border rounded transition-colors ${personalization[currentField.id] === opt.label ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-primary'}`}>
                            {opt.label}{opt.price ? ` (+R$${opt.price.toFixed(2)})` : ""}
                          </button>
                        ))}
                      </div>
                    )}

                    {(currentField.type === 'multiselect' || currentField.type === 'addon') && currentField.options && (
                      <div className="grid grid-cols-1 gap-2">
                        {currentField.options.map((opt) => {
                          const arr = (personalization[currentField.id] as string[]) || [];
                          const checked = arr.includes(opt.label);
                          return (
                            <button key={opt.label} onClick={() => toggleMulti(currentField.id, opt.label)}
                              className={`px-3 py-2 text-sm border rounded transition-colors flex items-center justify-between ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-primary'}`}>
                              <span className="flex items-center gap-2">
                                <span className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? 'bg-primary-foreground/20 border-primary-foreground' : 'border-border'}`}>
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                {opt.label}
                              </span>
                              {opt.price ? <span className="text-xs">+R${opt.price.toFixed(2)}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentField.type === 'file' && (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer block">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {uploadedFiles[currentField.id] ? uploadedFiles[currentField.id]!.name : 'Clique aqui para enviar uma imagem'}
                        </p>
                        <p className="text-xs text-muted-foreground">(max 30MB · JPG, PNG)</p>
                        <input ref={fileInputRef} type="file" accept="image/*"
                          onChange={(e) => handleFileChange(currentField.id, e.target.files?.[0] || null)} className="hidden" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="gap-1">
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </Button>
                    <span className="text-xs text-muted-foreground">{currentStep + 1} de {steps.length}</span>
                    {!isLastStep ? (
                      <Button size="sm" onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} className="gap-1 bg-primary text-primary-foreground">
                        Próximo <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-pay-pix font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> Última etapa
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border">
                    <DeliveryDatePicker value={deliveryDate} onChange={setDeliveryDate} />
                  </div>
                </div>
              )}

              <div className="bg-cream-100 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Produto base</span>
                  <span className="font-medium">R${basePrice.toFixed(2)}</span>
                </div>
                {addonTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Adicionais</span>
                    <span className="font-medium">+R${addonTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Quantidade</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary text-lg">R${(unitPrice * quantity).toFixed(2)}</span>
                </div>
                {pixActive && (
                  <p className="text-xs text-pay-pix text-right font-medium">
                    💚 PIX: R${(unitPrice * quantity * (1 - pixPct / 100)).toFixed(2)} ({pixPct}% off)
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground uppercase tracking-wide">Quantidade</span>
                <div className="flex items-center border border-border rounded">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-sm font-medium border-x border-border">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {!validationCheck.ok && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2.5 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive font-medium">{validationCheck.reason}</p>
                  </div>
                )}
                <Button onClick={handleAddToCart} size="lg" disabled={!validationCheck.ok}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm font-semibold rounded-full disabled:opacity-50">
                  <ShoppingCart className="h-5 w-5 mr-2" /> Adicionar ao Carrinho
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button onClick={() => handleWhatsAppOrder("cartao")} size="lg" disabled={!validationCheck.ok} variant="outline"
                    className="w-full border-pay-card text-pay-card hover:bg-pay-card hover:text-pay-card-foreground uppercase tracking-wider text-xs font-semibold rounded-full disabled:opacity-50">
                    Cartão via WhatsApp
                  </Button>
                  <Button onClick={() => handleWhatsAppOrder("pix")} size="lg" disabled={!validationCheck.ok} variant="outline"
                    className="w-full border-pay-pix text-pay-pix hover:bg-pay-pix hover:text-pay-pix-foreground uppercase tracking-wider text-xs font-semibold rounded-full disabled:opacity-50">
                    PIX via WhatsApp{pixActive ? ` (${pixPct}% off)` : ""}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ProductDetail;
