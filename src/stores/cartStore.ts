import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  personalization?: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updatePersonalization: (id: string, text: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  allPersonalized: () => boolean;
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

      removeItem: (id) => {
        const { items } = get();
        set({ items: items.filter(i => i.id !== id) });
      },

      clearCart: () => set({ items: [] }),

      allPersonalized: () => {
        const { items } = get();
        return items.length > 0 && items.every(i => i.personalization && i.personalization.trim().length > 0);
      },
    }),
    {
      name: 'tracando-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
