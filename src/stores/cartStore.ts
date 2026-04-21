import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type FulfillmentMethod = 'entrega' | 'retirada';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  personalization?: string;
  /** ISO date YYYY-MM-DD chosen by the customer */
  deliveryDate?: string;
  /** Chosen before cart so checkout cannot skip delivery/pickup decision */
  fulfillmentMethod?: FulfillmentMethod;
  /** Optional seasonal campaign slug (e.g. 'dia-das-maes-2026') */
  campaign_slug?: string | null;
}

const MIN_PERSONALIZATION_LENGTH = 5;
const MIN_STRUCTURED_FIELDS = 2;
const INVALID_PATTERNS = [/^\.+$/, /^[\s\-_]+$/, /^[a-z]$/i];

export function isPersonalizationValid(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < MIN_PERSONALIZATION_LENGTH) return false;
  if (INVALID_PATTERNS.some((p) => p.test(trimmed))) return false;
  // Require structured personalization summary (at least N "Title: value" pairs separated by " | ")
  // This guarantees the item went through the product page personalization flow.
  const parts = trimmed.split(" | ").filter((p) => /[^:]+:\s*\S+/.test(p));
  return parts.length >= MIN_STRUCTURED_FIELDS;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updatePersonalization: (id: string, text: string) => void;
  updateDeliveryDate: (id: string, iso: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  allValid: () => boolean;
  invalidReason: () => string | null;
}

const hasOneFulfillmentMethod = (items: CartItem[]) => {
  const methods = Array.from(new Set(items.map((i) => i.fulfillmentMethod).filter(Boolean)));
  return methods.length === 1;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find(i => i.id === item.id && i.personalization === item.personalization && i.deliveryDate === item.deliveryDate && i.fulfillmentMethod === item.fulfillmentMethod);
        if (existing) {
          set({ items: items.map(i => i === existing ? { ...i, quantity: i.quantity + item.quantity } : i) });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return; }
        const { items } = get();
        set({ items: items.map(i => i.id === id ? { ...i, quantity } : i) });
      },

      updatePersonalization: (id, text) => {
        const { items } = get();
        set({ items: items.map(i => i.id === id ? { ...i, personalization: text } : i) });
      },

      updateDeliveryDate: (id, iso) => {
        const { items } = get();
        set({ items: items.map(i => i.id === id ? { ...i, deliveryDate: iso } : i) });
      },

      removeItem: (id) => {
        const { items } = get();
        set({ items: items.filter(i => i.id !== id) });
      },

      clearCart: () => set({ items: [] }),

      allValid: () => {
        const { items } = get();
        if (items.length === 0) return false;
        return items.every((i) => isPersonalizationValid(i.personalization) && !!i.deliveryDate && !!i.fulfillmentMethod) && hasOneFulfillmentMethod(items);
      },

      invalidReason: () => {
        const { items } = get();
        if (items.length === 0) return "Carrinho vazio";
        for (const i of items) {
          if (!isPersonalizationValid(i.personalization)) {
            return `Personalização incompleta em "${i.name}". Volte à página do produto e preencha todas as etapas.`;
          }
          if (!i.deliveryDate) {
            return `Selecione a data desejada para "${i.name}".`;
          }
          if (!i.fulfillmentMethod) {
            return `Escolha entrega ou retirada para "${i.name}".`;
          }
        }
        if (!hasOneFulfillmentMethod(items)) {
          return "Use apenas entrega ou apenas retirada no mesmo pedido. Separe em dois pedidos para misturar as opções.";
        }
        return null;
      },
    }),
    {
      name: 'tracando-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
