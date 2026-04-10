import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProductById } from "@/lib/firebase";
import { useCartStore } from "@/stores/cartStore";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShoppingCart, Minus, Plus, ChevronRight, ChevronLeft, Upload, CreditCard } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const addItem = useCartStore(state => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['firebase-product', handle],
    queryFn: () => fetchProductById(handle!),
    enabled: !!handle,
  });

  const name = product ? (product.nome || (product as any).name || "Produto") : "";
  const price = product ? (product.preco || (product as any).price || 0) : 0;
  const originalPrice = product ? ((product as any).precoOriginal || (product as any).originalPrice) : null;
  const description = product ? (product.descricao || (product as any).description || "") : "";
  const images: string[] = product ? (product.imagens || (product.imagem ? [product.imagem] : [])) : [];
  const installments = price > 0 ? Math.ceil(price / 3) : 0;

  // Build personalization steps from product data
  const steps = useMemo(() => {
    if (!product) return [];
    const s: Array<{ id: string; title: string; type: 'text' | 'select' | 'file' | 'textarea'; options?: string[]; placeholder?: string; description?: string }> = [];

    // Check for personalization options in the product
    const opcoes = (product as any).opcoes || (product as any).options;
    if (opcoes && Array.isArray(opcoes)) {
      opcoes.forEach((opt: any) => {
        s.push({
          id: opt.id || opt.nome || opt.name,
          title: opt.nome || opt.name || opt.titulo || opt.title,
          type: opt.tipo === 'select' || opt.type === 'select' || (opt.valores && opt.valores.length > 0) ? 'select' : 'text',
          options: opt.valores || opt.values || opt.options,
          placeholder: opt.placeholder,
          description: opt.descricao || opt.description,
        });
      });
    }

    // Standard customization options
    s.push(
      {
        id: 'tipo_azulejo',
        title: 'Tipo de Azulejo',
        type: 'select',
        options: ['Informações do Nascimento', 'Foto + Frase', 'Monograma do Bebê'],
        description: 'Escolha o modelo de azulejo para o seu produto.',
      },
      {
        id: 'cor_box',
        title: 'Cor Predominante da Box',
        type: 'select',
        options: ['Rosa Chá', 'Verde Oliva', 'Bege', 'Marrom', 'Azul Claro'],
        description: 'Escolha a cor predominante da sua caixinha.',
      },
      {
        id: 'balao_frase',
        title: 'Balão de Frase',
        type: 'select',
        options: ['Feliz Aniversário', 'Eu Te Amo', 'Feliz Dia', 'Nós Te Amamos', 'Apenas Inicial'],
        description: 'Escolha a frase que vai no balão.',
      },
      { id: 'nome_presenteado', title: 'Nome/Apelido', type: 'text', placeholder: 'Nome de quem vai receber', description: 'Coloque o nome ou apelido da pessoa que irá receber o produto.' },
      { id: 'mensagem', title: 'Mensagem Personalizada', type: 'textarea', placeholder: 'Escreva sua mensagem aqui...', description: 'Uma mensagem especial para acompanhar o presente.' },
      { id: 'foto', title: 'Foto para Personalização', type: 'file', description: 'Envie a foto que deseja usar na personalização do produto.' },
      { id: 'enviado_por', title: 'Enviado por', type: 'text', placeholder: 'Seu nome', description: 'Coloque o nome de quem está enviando.' },
    );

    return s;
  }, [product]);

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

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name,
      price,
      image: images[0] || "",
      quantity,
    });
    toast.success("Adicionado ao carrinho!", { position: "top-center" });
  };

  const handleFileChange = (stepId: string, file: File | null) => {
    setUploadedFiles(prev => ({ ...prev, [stepId]: file }));
  };

  const handleWhatsAppOrder = () => {
    let text = `Olá! Gostaria de fazer um pedido:\n\n`;
    text += `📦 *${name}* (x${quantity})\n`;
    text += `💰 Total: R$${(price * quantity).toFixed(2)}\n\n`;
    text += `✏️ *Personalização:*\n`;

    Object.entries(personalization).forEach(([key, value]) => {
      if (value) {
        const step = steps.find(s => s.id === key);
        text += `• ${step?.title || key}: ${value}\n`;
      }
    });

    Object.entries(uploadedFiles).forEach(([key, file]) => {
      if (file) {
        const step = steps.find(s => s.id === key);
        text += `• ${step?.title || key}: (foto anexada separadamente)\n`;
      }
    });

    window.open(`https://wa.me/558287060860?text=${encodeURIComponent(text)}`, '_blank');
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
            {/* Images - Gallery style like umcaixote */}
            <div className="flex gap-3">
              {/* Thumbnails on the side */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2 w-16 flex-shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-20 rounded overflow-hidden border-2 transition-colors flex-shrink-0 ${
                        i === selectedImage ? 'border-primary' : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="flex-1">
                <div className="aspect-[3/4] rounded overflow-hidden bg-muted">
                  {images[selectedImage] ? (
                    <img src={images[selectedImage]} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem imagem</div>
                  )}
                </div>
                {/* Mobile thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 md:hidden overflow-x-auto">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`w-14 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${
                          i === selectedImage ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product info + Personalization */}
            <div className="space-y-6">
              {/* Title and price */}
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground uppercase tracking-wide mb-3">
                  {name}
                </h1>
                <div className="flex items-center gap-3">
                  {originalPrice && originalPrice > price && (
                    <span className="text-lg text-muted-foreground line-through">R${originalPrice.toFixed(2)}</span>
                  )}
                  <span className="text-2xl font-bold text-primary">R${price.toFixed(2)}</span>
                </div>
                {installments > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou 3x de <span className="font-medium">R${installments.toFixed(2)}</span> sem juros
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-border" />

              {/* Description */}
              {description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">O que vem!?</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
              )}

              {/* Personalization wizard */}
              {steps.length > 0 && (
                <div className="bg-cream-50 border border-border rounded-lg p-5 space-y-5">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Personalização
                  </h3>

                  {/* Step indicator */}
                  <div className="flex items-center gap-1">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= currentStep ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Current step content */}
                  {steps[currentStep] && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        {steps[currentStep].title}
                      </label>
                      {steps[currentStep].description && (
                        <p className="text-xs text-muted-foreground">{steps[currentStep].description}</p>
                      )}

                      {steps[currentStep].type === 'text' && (
                        <input
                          type="text"
                          value={personalization[steps[currentStep].id] || ''}
                          onChange={(e) => setPersonalization(prev => ({ ...prev, [steps[currentStep].id]: e.target.value }))}
                          placeholder={steps[currentStep].placeholder}
                          className="w-full px-4 py-2.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}

                      {steps[currentStep].type === 'textarea' && (
                        <textarea
                          value={personalization[steps[currentStep].id] || ''}
                          onChange={(e) => setPersonalization(prev => ({ ...prev, [steps[currentStep].id]: e.target.value }))}
                          placeholder={steps[currentStep].placeholder}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                      )}

                      {steps[currentStep].type === 'select' && steps[currentStep].options && (
                        <div className="grid grid-cols-2 gap-2">
                          {steps[currentStep].options!.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setPersonalization(prev => ({ ...prev, [steps[currentStep].id]: opt }))}
                              className={`px-3 py-2 text-sm border rounded transition-colors ${
                                personalization[steps[currentStep].id] === opt
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border text-foreground hover:border-primary'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {steps[currentStep].type === 'file' && (
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            {uploadedFiles[steps[currentStep].id]
                              ? uploadedFiles[steps[currentStep].id]!.name
                              : 'Arraste uma imagem ou clique para enviar'}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(steps[currentStep].id, e.target.files?.[0] || null)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            style={{ position: 'relative' }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">(max 30MB)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                      disabled={currentStep === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentStep + 1} de {steps.length}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))}
                      disabled={currentStep === steps.length - 1}
                      className="gap-1 bg-primary text-primary-foreground"
                    >
                      Próximo <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Price summary */}
              <div className="bg-cream-100 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Produto</span>
                  <span className="font-medium">R${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantidade</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary text-lg">R${(price * quantity).toFixed(2)}</span>
                </div>
                {installments > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    ou 3x de R${(price * quantity / 3).toFixed(2)} sem juros
                  </p>
                )}
              </div>

              {/* Quantity */}
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

              {/* Action buttons */}
              <div className="space-y-3">
                <Button onClick={handleAddToCart} size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider text-sm font-semibold rounded-full">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
                        body: {
                          items: [{
                            title: name,
                            quantity,
                            unit_price: price,
                            picture_url: images[0] || '',
                          }],
                        },
                      });
                      if (error) throw error;
                      if (data?.init_point) window.open(data.init_point, '_blank');
                    } catch {
                      toast.error('Erro ao processar pagamento.');
                    }
                  }}
                  size="lg"
                  className="w-full bg-[hsl(210,80%,50%)] hover:bg-[hsl(210,80%,45%)] text-[hsl(0,0%,100%)] uppercase tracking-wider text-sm font-semibold rounded-full"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pagar com Mercado Pago
                </Button>
                <Button onClick={handleWhatsAppOrder} size="lg" variant="outline" className="w-full border-[hsl(140,60%,35%)] text-[hsl(140,60%,30%)] hover:bg-[hsl(140,60%,95%)] uppercase tracking-wider text-sm font-semibold rounded-full">
                  Pedir pelo WhatsApp
                </Button>
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
