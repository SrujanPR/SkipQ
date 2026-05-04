import { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, MenuItem } from '../types';

interface CartContextType {
  items: CartItem[];
  canteenId: number | null;
  canteenName: string | null;
  addItem: (menuItem: MenuItem, canteenId: number, canteenName: string) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType>(null!);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [canteenId, setCanteenId] = useState<number | null>(null);
  const [canteenName, setCanteenName] = useState<string | null>(null);

  const addItem = (menuItem: MenuItem, newCanteenId: number, newCanteenName: string) => {
    // If adding from a different canteen, clear the cart first
    if (canteenId !== null && canteenId !== newCanteenId) {
      setItems([{ menuItem, quantity: 1 }]);
      setCanteenId(newCanteenId);
      setCanteenName(newCanteenName);
      return;
    }

    setCanteenId(newCanteenId);
    setCanteenName(newCanteenName);
    setItems(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i =>
          i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems(prev => {
      const next = prev.filter(i => i.menuItem.id !== menuItemId);
      if (next.length === 0) {
        setCanteenId(null);
        setCanteenName(null);
      }
      return next;
    });
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.menuItem.id === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setCanteenId(null);
    setCanteenName(null);
  };

  const total = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, canteenId, canteenName, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
