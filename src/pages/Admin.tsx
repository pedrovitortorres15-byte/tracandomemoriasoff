import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MediaUploader } from "@/components/MediaUploader";
import { CustomFieldsBuilder } from "@/components/CustomFieldsBuilder";
import type { CustomField } from "@/lib/customFields";
import logoIcon from "@/assets/logo-icon.jpg";
import {
  Package, ShoppingBag, Users, Plus, ArrowLeft, Trash2, Edit2,
  Eye, ChevronDown, ChevronUp, LogOut, Save, X, Search, Settings as SettingsIcon
} from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string;
  shipping_number?: string | null;
  shipping_complement?: string | null;
  shipping_neighborhood?: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  status: string;
  total: number;
  personalization: string | null;
  notes: string | null;
  payment_method?: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; unit_price: number }[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  category: string | null;
  stock: number;
  active: boolean;
  custom_fields?: CustomField[];
}

const emptyForm = { name: "", description: "", price: 0, category: "", stock: 0, media_urls: [] as string[], custom_fields: [] as CustomField[] };

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"orders" | "products" | "customers" | "settings">("orders");
  const [settingsForm, setSettingsForm] = useState({
    daily_order_limit: 10,
    min_business_days: 5,
    pix_discount_percent: 10,
    pix_discount_active: true,
    delivery_window_text: "Entregas no período da tarde (14h às 17h)",
    pickup_enabled: true,
    pickup_address: "",
    pickup_window_text: "Retirada das 14h às 17h",
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState(false);
  const [productForm, setProductForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
      loadProducts();
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    const { data } = await (supabase as any).from("delivery_settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setSettingsForm({
        daily_order_limit: data.daily_order_limit,
        min_business_days: data.min_business_days,
        pix_discount_percent: data.pix_discount_percent,
        pix_discount_active: data.pix_discount_active,
        delivery_window_text: data.delivery_window_text || "",
        pickup_enabled: data.pickup_enabled ?? true,
        pickup_address: data.pickup_address || "",
        pickup_window_text: data.pickup_window_text || "Retirada das 14h às 17h",
      });
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        daily_order_limit: Number(settingsForm.daily_order_limit) || 10,
        min_business_days: Number(settingsForm.min_business_days) || 5,
        pix_discount_percent: Number(settingsForm.pix_discount_percent) || 10,
        pix_discount_active: !!settingsForm.pix_discount_active,
        delivery_window_text: settingsForm.delivery_window_text || null,
        pickup_enabled: !!settingsForm.pickup_enabled,
        pickup_address: settingsForm.pickup_address || "",
        pickup_window_text: settingsForm.pickup_window_text || "",
      };
      if (settingsId) {
        const { error } = await (supabase as any).from("delivery_settings").update(payload).eq("id", settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("delivery_settings").insert(payload).select().single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }
      toast.success("Configurações salvas!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) {
      const ordersWithItems = await Promise.all(
        data.map(async (order: any) => {
          const { data: items } = await supabase.from("order_items").select("product_name, quantity, unit_price").eq("order_id", order.id);
          return { ...order, items: items || [] } as Order;
        })
      );
      setOrders(ordersWithItems);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (data) setProducts(data as any);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success(`Pedido atualizado para: ${status}`);
    loadOrders();
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: Number(productForm.price) || 0,
        category: productForm.category.trim() || null,
        stock: Number(productForm.stock) || 0,
        media_urls: productForm.media_urls,
        image_url: productForm.media_urls[0] || null,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, active: true });
        if (error) throw error;
        toast.success("Produto criado!");
      }
      setEditingProduct(null);
      setNewProduct(false);
      setProductForm(emptyForm);
      loadProducts();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto excluído!");
    loadProducts();
  };

  const toggleProductActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active: !active }).eq("id", id);
    loadProducts();
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct(false);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      category: product.category || "",
      stock: product.stock,
      media_urls: product.media_urls && product.media_urls.length > 0 ? product.media_urls : (product.image_url ? [product.image_url] : []),
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!isAdmin) return null;

  const statusColors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800",
    confirmado: "bg-blue-100 text-blue-800",
    enviado: "bg-purple-100 text-purple-800",
    entregue: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
  };

  const filteredOrders = orders.filter(o =>
    !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img src={logoIcon} alt="Loja Traçando Memórias" className="h-9 w-9 rounded-full object-cover border border-primary/30" />
            <div>
              <h1 className="font-heading text-base md:text-lg font-bold leading-tight">Painel da Dona</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Loja Traçando Memórias</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <div className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Pedidos</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Produtos</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  R$ {orders.reduce((s, o) => s + Number(o.total), 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + busca */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="flex gap-2 flex-wrap">
            {([["orders", "Pedidos", ShoppingBag], ["products", "Produtos", Package], ["customers", "Clientes", Users], ["settings", "Configurações", SettingsIcon]] as const).map(([key, label, Icon]) => (
              <Button
                key={key}
                variant={tab === key ? "default" : "outline"}
                onClick={() => { setTab(key as any); setSearch(""); }}
                size="sm"
              >
                <Icon className="h-4 w-4 mr-2" /> {label}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm sm:ml-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum pedido</p>
            ) : filteredOrders.map((order) => (
              <div key={order.id} className="bg-card border rounded-lg overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || "bg-muted"}`}>
                        {order.status}
                      </span>
                      <span className="font-medium">{order.customer_name}</span>
                      <span className="text-sm text-muted-foreground">{order.customer_phone}</span>
                      {order.payment_method && (
                        <span className="text-[10px] uppercase tracking-wide bg-muted px-2 py-0.5 rounded">{order.payment_method}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {expandedOrder === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="border-t p-4 space-y-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Dados do Cliente</h4>
                        <p className="text-sm"><strong>Nome:</strong> {order.customer_name}</p>
                        <p className="text-sm"><strong>E-mail:</strong> {order.customer_email || "—"}</p>
                        <p className="text-sm">
                          <strong>WhatsApp:</strong>{" "}
                          {order.customer_phone ? (
                            <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-primary underline">
                              {order.customer_phone}
                            </a>
                          ) : "—"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Endereço de Envio</h4>
                        <p className="text-sm">{order.shipping_address}, {order.shipping_number} {order.shipping_complement && `— ${order.shipping_complement}`}</p>
                        <p className="text-sm">{order.shipping_neighborhood}</p>
                        <p className="text-sm">{order.shipping_city} - {order.shipping_state}</p>
                        <p className="text-sm">CEP: {order.shipping_zip}</p>
                      </div>
                    </div>

                    {order.personalization && (
                      <div className="bg-accent/20 p-3 rounded">
                        <h4 className="font-semibold mb-1">✨ Personalização</h4>
                        <p className="text-sm whitespace-pre-wrap">{order.personalization}</p>
                      </div>
                    )}

                    {order.notes && (
                      <div className="bg-muted p-3 rounded">
                        <h4 className="font-semibold mb-1">Observações</h4>
                        <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>{item.product_name} x{item.quantity}</span>
                          <span>R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {["pendente", "confirmado", "enviado", "entregue", "cancelado"].map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={order.status === s ? "default" : "outline"}
                          onClick={() => updateOrderStatus(order.id, s)}
                          className="text-xs capitalize"
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <div className="space-y-4">
            {!newProduct && !editingProduct && (
              <Button onClick={() => { setNewProduct(true); setProductForm(emptyForm); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Produto
              </Button>
            )}

            {(newProduct || editingProduct) && (
              <div className="bg-card border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">{editingProduct ? "Editar Produto" : "Novo Produto"}</h3>
                <Input placeholder="Nome do produto *" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} maxLength={120} />
                <Textarea placeholder="Descrição" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} maxLength={1000} />
                <div className="grid grid-cols-3 gap-3">
                  <Input type="number" step="0.01" placeholder="Preço (R$)" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })} />
                  <Input placeholder="Categoria" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} maxLength={60} />
                  <Input type="number" placeholder="Estoque" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })} />
                </div>

                <MediaUploader
                  value={productForm.media_urls}
                  onChange={(urls) => setProductForm({ ...productForm, media_urls: urls })}
                  maxItems={7}
                />

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveProduct} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={() => { setNewProduct(false); setEditingProduct(null); setProductForm(emptyForm); }}>
                    <X className="h-4 w-4 mr-2" /> Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const cover = (product.media_urls && product.media_urls[0]) || product.image_url;
                const mediaCount = (product.media_urls?.length || 0) + (product.video_url ? 1 : 0);
                return (
                  <div key={product.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
                    {cover ? (
                      <img src={cover} alt={product.name} className="w-14 h-14 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-muted-foreground"><Package className="h-5 w-5" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">R$ {Number(product.price).toFixed(2)} • Estoque: {product.stock} • {mediaCount} mídia(s)</p>
                    </div>
                    <Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Ativo" : "Inativo"}</Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleProductActive(product.id, product.active)} title={product.active ? "Desativar" : "Ativar"}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(product)} title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteProduct(product.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {tab === "customers" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum cliente ainda</p>
            ) : (
              (() => {
                const customers = new Map<string, { name: string; email: string | null; phone: string | null; orderCount: number; totalSpent: number; lastOrder: string }>();
                orders.forEach((o) => {
                  const key = o.customer_phone || o.customer_email || o.customer_name;
                  const existing = customers.get(key);
                  if (existing) {
                    existing.orderCount++;
                    existing.totalSpent += Number(o.total);
                  } else {
                    customers.set(key, { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, orderCount: 1, totalSpent: Number(o.total), lastOrder: o.created_at });
                  }
                });
                const list = Array.from(customers.values()).filter(c =>
                  !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
                  c.phone?.toLowerCase().includes(search.toLowerCase()) ||
                  c.email?.toLowerCase().includes(search.toLowerCase())
                );
                return list.map((c, i) => (
                  <div key={i} className="bg-card border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.email || "—"}
                        {c.phone && <> • <a className="text-primary underline" href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener">{c.phone}</a></>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {c.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{c.orderCount} pedido(s) • último em {new Date(c.lastOrder).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-card border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-semibold">Entrega & Pagamento</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Ajuste estas regras a qualquer momento sem mexer no código. As mudanças valem para todo o site na hora.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Limite diário de pedidos</label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={settingsForm.daily_order_limit}
                    onChange={(e) => setSettingsForm({ ...settingsForm, daily_order_limit: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Quantos pedidos no máximo por data de entrega (atual: 10).</p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">Prazo mínimo (dias úteis)</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settingsForm.min_business_days}
                    onChange={(e) => setSettingsForm({ ...settingsForm, min_business_days: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">A partir de quantos dias úteis o cliente pode escolher entrega (atual: 5).</p>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1.5">Texto da janela de entrega</label>
                  <Input
                    value={settingsForm.delivery_window_text}
                    onChange={(e) => setSettingsForm({ ...settingsForm, delivery_window_text: e.target.value })}
                    placeholder="Entregas no período da tarde (14h às 17h)"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Aparece para o cliente no checkout.</p>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.pix_discount_active}
                      onChange={(e) => setSettingsForm({ ...settingsForm, pix_discount_active: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    Ativar desconto no PIX
                  </label>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">% de desconto no PIX</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={settingsForm.pix_discount_percent}
                      onChange={(e) => setSettingsForm({ ...settingsForm, pix_discount_percent: parseInt(e.target.value) || 0 })}
                      disabled={!settingsForm.pix_discount_active}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Atual: 10%. Aplica em todo o site (carrinho, produto e checkout).</p>
                  </div>
                </div>

                <Button onClick={saveSettings} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar configurações"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
