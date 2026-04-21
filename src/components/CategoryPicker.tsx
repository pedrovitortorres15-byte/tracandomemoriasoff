import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  existing: string[];
  onChange: (value: string) => void;
}

/**
 * Mostra todas as categorias já cadastradas como chips clicáveis,
 * e permite criar uma nova categoria a qualquer momento.
 */
export const CategoryPicker = ({ value, existing, onChange }: Props) => {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-2 col-span-3 sm:col-span-1 border rounded-md p-2 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Categoria {value && <span className="text-foreground normal-case">— {value}</span>}
        </span>
        {!creating && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-[11px] px-2"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Nova
          </Button>
        )}
      </div>

      {existing.length === 0 && !creating ? (
        <p className="text-[11px] text-muted-foreground italic">
          Nenhuma categoria cadastrada ainda. Clique em "Nova" para criar.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {existing.map((c) => {
            const selected = value === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange(selected ? "" : c)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-input"
                )}
              >
                {selected && <Check className="h-3 w-3" />}
                {c}
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <div className="flex gap-1 pt-1">
          <Input
            autoFocus
            placeholder="Ex: Caixas, Canecas, Chaveiros…"
            value={existing.includes(value) ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={60}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setCreating(false)}
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
