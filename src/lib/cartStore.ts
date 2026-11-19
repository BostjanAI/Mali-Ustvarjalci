import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export type CartItem = { id: string; slug?: string; title: string; priceCents: number; quantity: number; image?: string };
export type CartState = { items: CartItem[]; addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void; removeItem: (id: string) => void; updateQty: (id: string, qty: number) => void; clear: () => void; totalCents: () => number };
const validQty = (qty: number) => Number.isFinite(qty) && Number.isInteger(qty) && qty > 0;
export const useCartStore = create<CartState>()(persist((set, get) => ({
 items: [],
 addItem: (item, qty = 1) => { if (!validQty(qty) || !Number.isInteger(item.priceCents) || item.priceCents < 0) return; set(state => { const existing = state.items.find(i => i.id === item.id);return { items: existing ? state.items.map(i => i.id === item.id ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i) : [...state.items, { ...item, quantity: Math.min(99, qty) }] }; }); },
 removeItem: id => set(state => ({ items: state.items.filter(i => i.id !== id) })),
 updateQty: (id, qty) => { if(!validQty(qty)) return;set(state => ({ items: state.items.map(i => i.id === id ? { ...i, quantity: Math.min(99,qty) } : i) })); },
 clear: () => set({ items: [] }),
 totalCents: () => get().items.reduce((total,i) => total + i.priceCents * i.quantity, 0),
}), { name: 'mali-ustvarjalci-cart-v1', storage: createJSONStorage(() => localStorage), partialize: state => ({ items: state.items }), skipHydration: true }));
