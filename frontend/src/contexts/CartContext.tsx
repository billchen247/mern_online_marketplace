import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartApi, wishlistApi } from '../api/services';
import type { Cart } from '../types';
import { cartItemCount } from '../utils/pricing';
import { useAuth } from './AuthContext';

interface CartState {
  cart: Cart | null;
  count: number;
  wishlistIds: Set<string>;
  loading: boolean;
  refresh: (coupon?: string) => Promise<Cart | null>;
  add: (productId: string, qty?: number) => Promise<void>;
  update: (itemId: string, qty: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}
const Ctx = createContext<CartState | null>(null);

/** Cart + wishlist are server-side, tied to the authenticated user; this context caches them for the UI. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (coupon?: string) => {
    setLoading(true);
    try {
      const c = await cartApi.get(coupon);
      setCart(c);
      return c;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshWishlist = useCallback(async () => {
    try {
      setWishlistIds(new Set((await wishlistApi.get()).map((p) => p._id)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refresh();
      void refreshWishlist();
    } else {
      setCart(null);
      setWishlistIds(new Set());
    }
  }, [user, refresh, refreshWishlist]);

  const value = useMemo<CartState>(
    () => ({
      cart,
      count: cart ? cartItemCount(cart.items) : 0,
      wishlistIds,
      loading,
      refresh,
      refreshWishlist,
      add: async (id, qty = 1) => setCart(await cartApi.add(id, qty)),
      update: async (id, qty) => setCart(await cartApi.update(id, qty)),
      remove: async (id) => setCart(await cartApi.remove(id)),
      clear: async () => {
        await cartApi.clear();
        await refresh();
      },
      toggleWishlist: async (id) => {
        if (wishlistIds.has(id)) {
          setWishlistIds(new Set((await wishlistApi.remove(id)).map((p) => p._id)));
          return false;
        }
        setWishlistIds(new Set((await wishlistApi.add(id)).map((p) => p._id)));
        return true;
      },
    }),
    [cart, wishlistIds, loading, refresh, refreshWishlist],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCart(): CartState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used within CartProvider');
  return c;
}
