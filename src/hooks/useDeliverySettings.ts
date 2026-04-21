import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliverySettings {
  id: string;
  daily_order_limit: number;
  min_business_days: number;
  delivery_window_text: string | null;
  pix_discount_percent: number;
  pix_discount_active: boolean;
  pickup_enabled: boolean;
  pickup_address: string;
  pickup_window_text: string;
}

const DEFAULTS: DeliverySettings = {
  id: "default",
  daily_order_limit: 10,
  min_business_days: 5,
  delivery_window_text: "Entregas no período da tarde (14h às 17h)",
  pix_discount_percent: 10,
  pix_discount_active: true,
  pickup_enabled: true,
  pickup_address: "Bairro Antares",
  pickup_window_text: "Retirada das 14h às 17h (combine previamente pelo WhatsApp)",
};

export function useDeliverySettings() {
  return useQuery({
    queryKey: ["delivery-settings"],
    queryFn: async (): Promise<DeliverySettings> => {
      const { data, error } = await supabase
        .from("delivery_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error || !data) return DEFAULTS;
      return { ...DEFAULTS, ...(data as any) } as DeliverySettings;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDeliveryCapacity(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["delivery-capacity", startISO, endISO],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await (supabase as any).rpc("get_delivery_capacity", {
        start_date: startISO,
        end_date: endISO,
      });
      if (error || !data) return {};
      const map: Record<string, number> = {};
      (data as any[]).forEach((row) => {
        const dateStr = typeof row.delivery_date === "string"
          ? row.delivery_date
          : new Date(row.delivery_date).toISOString().slice(0, 10);
        map[dateStr] = Number(row.count);
      });
      return map;
    },
    staleTime: 1000 * 60,
  });
}

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  delivery_date: string | null;
  active: boolean;
  note: string | null;
}

export function useCampaigns(onlyActive = true) {
  return useQuery({
    queryKey: ["campaigns", onlyActive],
    queryFn: async (): Promise<Campaign[]> => {
      let q = (supabase as any).from("campaigns").select("*").order("delivery_date", { ascending: true });
      if (onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error || !data) return [];
      return data as Campaign[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
