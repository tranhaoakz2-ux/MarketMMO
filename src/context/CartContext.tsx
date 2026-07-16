"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  slug: string;
  name: string;
  price: number;
  seller: string;
  stock: number;
  quantity: number;
};

function matchesLine(l: CartLine, productId: string, variantId?: string) {
  return l.productId === productId && (l.variantId ?? undefined) === (variantId ?? undefined);
}

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  subtotal: number;
  addItem: (item: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "marketmmo_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => matchesLine(l, item.productId, item.variantId));
      if (existing) {
        return prev.map((l) =>
          matchesLine(l, item.productId, item.variantId)
            ? { ...l, quantity: Math.min(l.stock, l.quantity + quantity) }
            : l
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.stock, quantity) }];
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    setLines((prev) => prev.filter((l) => !matchesLine(l, productId, variantId)));
  };

  const setQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId, variantId);
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        matchesLine(l, productId, variantId)
          ? { ...l, quantity: Math.min(l.stock, quantity) }
          : l
      )
    );
  };

  const clear = () => setLines([]);

  const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, totalCount, subtotal, addItem, removeItem, setQuantity, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
