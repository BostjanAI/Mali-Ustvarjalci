import { create } from 'zustand';

export type CartItem = {
  id: string;
  slug?: string;
  title: string;
  priceCents: number;
  quantity: number;
  image?: string;
};

export type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  totalCents: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item, qty = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: qty }] };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  updateQty: (id, qty) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)) })),
  clear: () => set({ items: [] }),
  totalCents: () => get().items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
}));





