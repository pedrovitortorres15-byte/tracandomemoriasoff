import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package, ShoppingBag, Users, Plus, ArrowLeft, Trash2, Edit2,
  Eye, ChevronDown, ChevronUp, LogOut, Save, X
} from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  status: string;
  total: number;
  personalization: string | null;
  notes: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; unit_price: number }[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
  active: boolean;
}

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"orders" | "products" | "customers">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: 0, image_url: "", category: "", stock: 0 });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
      loadProducts();
    }
  }, [isAdmin]);

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (data) {
      const ordersWithItems = await Promise.all(
        data.map(async (order) => {
          const { data: items } = await supabase.from("order_items").select("product_name, quantity, unit_price").eq("order_id", order.id);
          return { ...order, items: items || [] };
        })
      );
      setOrders(ordersWithItems);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (data) setProducts(data);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    toast.success(`Pedido atualizado para: ${status}`);
    loadOrders();
  };

  const saveProduct = async () => {
    if (editingProduct) {
      await supabase.from("products").update(productForm).eq("id", editingProduct.id);
      toast.success("Produto atualizado!");
    } else {
      await supabase.from("products").insert({ ...productForm, active: true });
      toast.success("Produto criado!");
    }
    setEditingProduct(null);
    setNewProduct(false);
    setProductForm({ name: "", description: "", price: 0, image_url: "", category: "", stock: 0 });
    loadProducts();
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!isAdmin) return null;

  const statusColors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800",
    confirmado: "bg-blue-100 text-blue-800",
    enviado: "bg-purple-100 text-purple-800",
    entregue: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold">Painel Admin</h1>
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
                  R$ {orders.reduce((s, o) => s + o.total, 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([["orders", "Pedidos", ShoppingBag], ["products", "Produtos", Package], ["customers", "Clientes", Users]] as const).map(([key, label, Icon]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key as any)}
              size="sm"
            >
              <Icon className="h-4 w-4 mr-2" /> {label}
            </Button>
          ))}
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum pedido ainda</p>
            ) : orders.map((order) => (
              <div key={order.id} className="bg-card border rounded-lg overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status] || "bg-muted"}`}>
                        {order.status}
                      </span>
                      <span className="font-medium">{order.customer_name}</span>
                      <span className="text-sm text-muted-foreground">{order.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">R$ {order.total.toFixed(2)}</span>
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
                        <p className="text-sm"><strong>Email:</strong> {order.customer_email || "—"}</p>
                        <p className="text-sm"><strong>Telefone:</strong> {order.customer_phone || "—"}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Endereço de Envio</h4>
                        <p className="text-sm">{order.shipping_address}</p>
                        <p className="text-sm">{order.shipping_city} - {order.shipping_state}</p>
                        <p className="text-sm">CEP: {order.shipping_zip}</p>
                      </div>
                    </div>

                    {order.personalization && (
                      <div className="bg-accent/20 p-3 rounded">
                        <h4 className="font-semibold mb-1">✨ Personalização</h4>
                        <p className="text-sm">{order.personalization}</p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span>{item.product_name} x{item.quantity}</span>
                          <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
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
            <Button onClick={() => { setNewProduct(true); setProductForm({ name: "", description: "", price: 0, image_url: "", category: "", stock: 0 }); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Produto
            </Button>

            {(newProduct || editingProduct) && (
              <div className="bg-card border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">{editingProduct ? "Editar Produto" : "Novo Produto"}</h3>
                <Input placeholder="Nome" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <Textarea placeholder="Descrição" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <Input type="number" placeholder="Preço" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })} />
                  <Input placeholder="Categoria" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
                  <Input type="number" placeholder="Estoque" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })} />
                </div>
                <Input placeholder="URL da Imagem" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} />
                <div className="flex gap-2">
                  <Button onClick={saveProduct}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
                  <Button variant="outline" onClick={() => { setNewProduct(false); setEditingProduct(null); }}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">R$ {product.price.toFixed(2)} • Estoque: {product.stock}</p>
                  </div>
                  <Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Ativo" : "Inativo"}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleProductActive(product.id, product.active)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditingProduct(product);
                      setNewProduct(false);
                      setProductForm({
                        name: product.name,
                        description: product.description || "",
                        price: product.price,
                        image_url: product.image_url || "",
                        category: product.category || "",
                        stock: product.stock,
                      });
                    }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
                const customers = new Map<string, { name: string; email: string | null; phone: string | null; orderCount: number; totalSpent: number }>();
                orders.forEach((o) => {
                  const key = o.customer_phone || o.customer_email || o.customer_name;
                  const existing = customers.get(key);
                  if (existing) {
                    existing.orderCount++;
                    existing.totalSpent += o.total;
                  } else {
                    customers.set(key, { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, orderCount: 1, totalSpent: o.total });
                  }
                });
                return Array.from(customers.values()).map((c, i) => (
                  <div key={i} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.email} • {c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {c.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{c.orderCount} pedido(s)</p>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
