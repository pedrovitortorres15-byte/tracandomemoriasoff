import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  confirmado: "bg-blue-100 text-blue-800",
  enviado: "bg-purple-100 text-purple-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Tables<"orders"> | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["admin-order-items", selectedOrder?.id],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", selectedOrder!.id);
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status atualizado!");
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-foreground">Pedidos</h2>
      <Card>
        <CardContent className="p-0">
          {!orders?.length ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum pedido ainda</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                    <TableCell>{order.customer_phone || "-"}</TableCell>
                    <TableCell>{order.shipping_city || "-"}</TableCell>
                    <TableCell>R$ {Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={order.status}
                        onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["pendente", "confirmado", "enviado", "entregue", "cancelado"].map((s) => (
                            <SelectItem key={s} value={s}>
                              <Badge className={statusColors[s]}>{s}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Pedido</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><strong>Cliente:</strong> {order.customer_name}</div>
                              <div><strong>Email:</strong> {order.customer_email || "-"}</div>
                              <div><strong>Telefone:</strong> {order.customer_phone || "-"}</div>
                              <div><strong>Status:</strong> {order.status}</div>
                            </div>
                            <div className="text-sm">
                              <strong>Endereço de envio:</strong>
                              <p>{order.shipping_address}</p>
                              <p>{order.shipping_city} - {order.shipping_state}, {order.shipping_zip}</p>
                            </div>
                            {order.notes && (
                              <div className="text-sm"><strong>Observações:</strong> {order.notes}</div>
                            )}
                            <div>
                              <strong className="text-sm">Itens:</strong>
                              {orderItems?.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                                  <span>{item.product_name} x{item.quantity}</span>
                                  <span>R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-right font-bold">Total: R$ {Number(order.total).toFixed(2)}</div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
