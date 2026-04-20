/**
 * Schema for dynamic personalization fields per product.
 * Stored as JSONB in products.custom_fields.
 */
export type CustomFieldType = "text" | "textarea" | "select" | "multiselect" | "file" | "addon";

export interface CustomFieldOption {
  /** Display label */
  label: string;
  /** Extra price added when selected (BRL) */
  price?: number;
  /** Optional: when selected, show these subfields */
  subfields?: CustomField[];
}

export interface CustomField {
  /** Unique id (slug-like) */
  id: string;
  /** Visible question/title */
  title: string;
  type: CustomFieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  /** For select / multiselect / addon */
  options?: CustomFieldOption[];
}

export interface PersonalizationStep {
  id: string;
  title: string;
  type: CustomFieldType;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: CustomFieldOption[];
}

/** Backward-compat default steps used when a product has no custom_fields configured */
export const DEFAULT_FALLBACK_FIELDS: CustomField[] = [
  {
    id: "tipo_azulejo",
    title: "Tipo de Azulejo",
    type: "select",
    required: true,
    options: [
      { label: "Informações do Nascimento" },
      { label: "Foto + Frase" },
      { label: "Monograma do Bebê" },
    ],
    description: "Escolha o modelo de azulejo para o seu produto.",
  },
  {
    id: "cor_box",
    title: "Cor Predominante da Box",
    type: "select",
    required: true,
    options: [
      { label: "Rosa Chá" },
      { label: "Verde Oliva" },
      { label: "Bege" },
      { label: "Marrom" },
      { label: "Azul Claro" },
    ],
  },
  {
    id: "nome_presenteado",
    title: "Nome / Apelido",
    type: "text",
    required: true,
    placeholder: "Nome de quem vai receber",
  },
  {
    id: "mensagem",
    title: "Mensagem Personalizada",
    type: "textarea",
    required: true,
    placeholder: "Escreva sua mensagem aqui...",
  },
  {
    id: "foto",
    title: "Foto para Personalização",
    type: "file",
    required: false,
    description: "Opcional — envie uma foto se desejar.",
  },
];

/** Read custom_fields safely from a product row */
export function readCustomFields(product: any): CustomField[] {
  const cf = product?.custom_fields ?? product?.customFields;
  if (Array.isArray(cf) && cf.length > 0) return cf as CustomField[];
  return DEFAULT_FALLBACK_FIELDS;
}

/** Convert CustomField[] to runtime PersonalizationStep[] (used by ProductDetail) */
export function toSteps(fields: CustomField[]): PersonalizationStep[] {
  return fields.map((f) => ({
    id: f.id,
    title: f.title,
    type: f.type,
    description: f.description,
    placeholder: f.placeholder,
    required: f.required ?? true,
    options: f.options,
  }));
}

/** Calculate addon total based on selections (id -> selected label or labels[]) */
export function calcAddonTotal(fields: CustomField[], selections: Record<string, string | string[]>): number {
  let total = 0;
  for (const f of fields) {
    if (f.type !== "addon" && f.type !== "select" && f.type !== "multiselect") continue;
    if (!f.options) continue;
    const sel = selections[f.id];
    if (!sel) continue;
    const labels = Array.isArray(sel) ? sel : [sel];
    for (const label of labels) {
      const opt = f.options.find((o) => o.label === label);
      if (opt?.price) total += Number(opt.price) || 0;
    }
  }
  return total;
}
