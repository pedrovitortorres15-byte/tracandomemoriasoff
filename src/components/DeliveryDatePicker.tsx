import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addBusinessDays, isBusinessDay, formatDateISO } from "@/lib/businessDays";
import { useDeliverySettings, useDeliveryCapacity } from "@/hooks/useDeliverySettings";

interface Props {
  value?: Date;
  onChange: (d: Date | undefined) => void;
  className?: string;
  label?: string;
}

export const DeliveryDatePicker = ({ value, onChange, className, label = "Data de Entrega" }: Props) => {
  const [open, setOpen] = useState(false);
  const { data: settings } = useDeliverySettings();
  const minDays = settings?.min_business_days ?? 5;
  const dailyLimit = settings?.daily_order_limit ?? 10;

  const minDate = useMemo(() => addBusinessDays(new Date(), minDays), [minDays]);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  }, []);

  const { data: capacity } = useDeliveryCapacity(formatDateISO(minDate), formatDateISO(maxDate));

  const isDateDisabled = (date: Date): boolean => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < minDate) return true;
    if (d > maxDate) return true;
    if (!isBusinessDay(d)) return true;
    const iso = formatDateISO(d);
    const used = capacity?.[iso] ?? 0;
    return used >= dailyLimit;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-semibold flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-primary" />
        {label} <span className="text-destructive">*</span>
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value
              ? format(value, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : "Escolha a data desejada"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d);
              if (d) setOpen(false);
            }}
            disabled={isDateDisabled}
            fromDate={minDate}
            toDate={maxDate}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="p-3 border-t bg-muted/40 text-[11px] text-muted-foreground space-y-1">
            <p>📅 Prazo mínimo: {minDays} dias úteis</p>
            <p>🚚 {settings?.delivery_window_text || "Entregas no período da tarde"}</p>
            <p>⚠️ Datas cinzas estão lotadas ou indisponíveis</p>
          </div>
        </PopoverContent>
      </Popover>
      {!value && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Selecione uma data para continuar
        </p>
      )}
    </div>
  );
};
