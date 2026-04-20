import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import type { CustomField, CustomFieldType, CustomFieldOption } from "@/lib/customFields";

interface Props {
  value: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  select: "Lista (1 opção)",
  multiselect: "Lista (várias)",
  file: "Upload de imagem",
  addon: "Adicional pago (+R$)",
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `campo_${Date.now()}`;

export const CustomFieldsBuilder = ({ value, onChange }: Props) => {
  const update = (idx: number, patch: Partial<CustomField>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addField = () => {
    onChange([
      ...value,
      { id: `campo_${Date.now()}`, title: "Novo campo", type: "text", required: true },
    ]);
  };

  const removeField = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const updateOption = (fIdx: number, oIdx: number, patch: Partial<CustomFieldOption>) => {
    const f = value[fIdx];
    const opts = [...(f.options || [])];
    opts[oIdx] = { ...opts[oIdx], ...patch };
    update(fIdx, { options: opts });
  };

  const addOption = (fIdx: number) => {
    const f = value[fIdx];
    update(fIdx, { options: [...(f.options || []), { label: "Nova opção" }] });
  };

  const removeOption = (fIdx: number, oIdx: number) => {
    const f = value[fIdx];
    update(fIdx, { options: (f.options || []).filter((_, i) => i !== oIdx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Campos de personalização deste produto</h4>
          <p className="text-[11px] text-muted-foreground">
            Defina quais perguntas o cliente verá. Vazio = usar campos padrão da loja.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addField}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Campo
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground italic border border-dashed rounded p-3 text-center">
          Nenhum campo personalizado. Clique em "Campo" para adicionar.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((f, idx) => (
            <div key={idx} className="border rounded-lg p-3 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={f.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    update(idx, { title, id: f.id?.startsWith("campo_") ? slugify(title) : f.id });
                  }}
                  placeholder="Título do campo (ex: Nome da pessoa)"
                  className="flex-1 h-8 text-sm"
                />
                <select
                  value={f.type}
                  onChange={(e) => update(idx, { type: e.target.value as CustomFieldType, options: ["select", "multiselect", "addon"].includes(e.target.value) ? f.options || [] : undefined })}
                  className="h-8 text-xs border rounded px-2 bg-background"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={f.required ?? true}
                    onChange={(e) => update(idx, { required: e.target.checked })}
                  />
                  Obrig.
                </label>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === value.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeField(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {(f.type === "text" || f.type === "textarea") && (
                <Input
                  value={f.placeholder || ""}
                  onChange={(e) => update(idx, { placeholder: e.target.value })}
                  placeholder="Placeholder (texto-fantasma)"
                  className="h-8 text-xs"
                />
              )}

              <Input
                value={f.description || ""}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Descrição/ajuda (opcional)"
                className="h-8 text-xs"
              />

              {(f.type === "select" || f.type === "multiselect" || f.type === "addon") && (
                <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Opções</span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addOption(idx)}>
                      <Plus className="h-3 w-3 mr-1" /> Opção
                    </Button>
                  </div>
                  {(f.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-1.5">
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(idx, oIdx, { label: e.target.value })}
                        placeholder="Nome da opção"
                        className="h-7 text-xs flex-1"
                      />
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">+R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={opt.price ?? 0}
                          onChange={(e) => updateOption(idx, oIdx, { price: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs w-20"
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeOption(idx, oIdx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
