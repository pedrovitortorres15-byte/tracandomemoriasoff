import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  personalization?: string;
  /** ISO date YYYY-MM-DD chosen by the customer */
  deliveryDate?: string;
  /** Optional seasonal campaign slug (e.g. 'dia-das-maes-2026') */
  campaign_slug?: string | null;
}

const MIN_PERSONALIZATION_LENGTH = 5;
const INVALID_PATTERNS = [/^\.+$/, /^[\s\-_]+$/, /^[a-z]$/i];

export function isPersonalizationValid(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < MIN_PERSONALIZATION_LENGTH) return false;
  return !INVALID_PATTERNS.some((p) => p.test(trimmed));
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find(i => i.id === item.id);
        if (existing) {
          set({ items: items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i) });
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
        return items.every((i) => isPersonalizationValid(i.personalization) && !!i.deliveryDate);
      },

      invalidReason: () => {
        const { items } = get();
        if (items.length === 0) return "Carrinho vazio";
        for (const i of items) {
          if (!isPersonalizationValid(i.personalization)) {
            return `Personalização inválida em "${i.name}". Escreva pelo menos ${MIN_PERSONALIZATION_LENGTH} caracteres reais.`;
          }
          if (!i.deliveryDate) {
            return `Selecione a data de entrega para "${i.name}".`;
          }
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
