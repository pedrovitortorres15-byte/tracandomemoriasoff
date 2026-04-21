import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Props {
  value: string;
  existing: string[];
  onChange: (value: string) => void;
}

/**
 * Seletor de categoria que mostra as categorias já cadastradas
 * e permite criar uma nova quando necessário.
 */
export const CategoryPicker = ({ value, existing, onChange }: Props) => {
  // Modo "nova" quando o valor digitado não está na lista existente
  // ou quando a usuária clica em "Nova categoria".
  const isNewValue = value.trim() !== "" && !existing.includes(value);
  const [creating, setCreating] = useState(isNewValue);

  if (creating || existing.length === 0) {
    return (
      <div className="flex gap-1">
        <Input
          autoFocus={creating}
          placeholder="Nova categoria"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
        />
        {existing.length > 0 && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            onClick={() => { onChange(""); setCreating(false); }}
            title="Escolher de existentes"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === "__new__") {
            onChange("");
            setCreating(true);
          } else {
            onChange(e.target.value);
          }
        }}
        className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="">— Categoria —</option>
        {existing.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value="__new__">+ Nova categoria…</option>
      </select>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-10 w-10 shrink-0"
        onClick={() => { onChange(""); setCreating(true); }}
        title="Adicionar nova categoria"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
