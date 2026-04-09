import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: products } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["admin-pending-orders"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pendente");
      return count || 0;
    },
  });

  const { data: totalRevenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("total");
      return data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
    },
  });

  const stats = [
    { title: "Total de Produtos", value: products ?? 0, icon: Package, color: "text-primary" },
    { title: "Total de Pedidos", value: orders ?? 0, icon: ShoppingCart, color: "text-warm-600" },
    { title: "Pedidos Pendentes", value: pendingOrders ?? 0, icon: TrendingUp, color: "text-destructive" },
    { title: "Receita Total", value: `R$ ${(totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-warm-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
