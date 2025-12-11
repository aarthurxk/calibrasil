import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
  model?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string, size?: string, color?: string, model?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string, color?: string, model?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CART_STORAGE_KEY = 'cali-cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

// Generate unique key for cart item based on all variants
const getItemKey = (id: string, size?: string, color?: string, model?: string) => {
  return `${id}-${size || ''}-${color || ''}-${model || ''}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      // Find existing item with same id AND same variants
      const existingItem = prev.find((item) => 
        item.id === newItem.id && 
        item.size === newItem.size && 
        item.color === newItem.color &&
        item.model === newItem.model
      );
      
      if (existingItem) {
        return prev.map((item) =>
          item.id === newItem.id && 
          item.size === newItem.size && 
          item.color === newItem.color &&
          item.model === newItem.model
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string, size?: string, color?: string, model?: string) => {
    setItems((prev) => prev.filter((item) => 
      !(item.id === id && item.size === size && item.color === color && item.model === model)
    ));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number, size?: string, color?: string, model?: string) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => 
        !(item.id === id && item.size === size && item.color === color && item.model === model)
      ));
    } else {
      setItems((prev) =>
        prev.map((item) => 
          (item.id === id && item.size === size && item.color === color && item.model === model)
            ? { ...item, quantity }
            : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
