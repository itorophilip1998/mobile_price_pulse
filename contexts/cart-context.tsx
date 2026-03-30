import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { cartAPI, Cart, CartItem } from '@/lib/api/cart';
import { useAuth } from '@/hooks/use-auth';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  busyProductIds: Set<string>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { getToken } = useClerkAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyProductIds, setBusyProductIds] = useState<Set<string>>(new Set());
  const busyRef = useRef<Set<string>>(new Set());

  const markBusy = useCallback((productId: string) => {
    busyRef.current.add(productId);
    setBusyProductIds(new Set(busyRef.current));
  }, []);

  const unmarkBusy = useCallback((productId: string) => {
    busyRef.current.delete(productId);
    setBusyProductIds(new Set(busyRef.current));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const cartData = await cartAPI.getCart(token ?? undefined);
      if (cartData && Array.isArray(cartData?.items) && typeof cartData?.count === 'number') {
        setCart({
          items: cartData.items,
          total: typeof cartData.total === 'number' ? cartData.total : 0,
          count: cartData.count,
        });
      } else {
        setCart(null);
      }
    } catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 401 || status === 404 || status === 500) {
        setCart(null);
      } else {
        setCart(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getToken]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    if (busyRef.current.has(productId)) return;

    const token = await getToken();
    if (!token) {
      throw new Error('Please sign in to add to cart');
    }

    markBusy(productId);
    try {
      await cartAPI.addToCart(productId, quantity, token);
      await refreshCart();
    } catch (error: unknown) {
      await refreshCart();
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number; data?: { message?: string } } }).response?.status
        : undefined;
      const rawMessage =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      const isClerkNotConfigured =
        typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('clerk is not configured');
      const message = isClerkNotConfigured
        ? 'Sign-in service is not set up yet. Please try again later or contact support.'
        : rawMessage ||
          (status === 401 ? 'Please sign in to add to cart' : null) ||
          (status === 404 ? 'Product not found' : null) ||
          'Could not add to cart. Please try again.';
      throw new Error(message);
    } finally {
      unmarkBusy(productId);
    }
  }, [refreshCart, getToken, markBusy, unmarkBusy]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!cart) return;
    
    // Optimistically update the cart state to preserve order
    const previousCart = cart;
    const updatedItems = cart.items
      .map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity };
        }
        return item;
      })
      .filter((item) => item.quantity > 0); // Remove items with 0 quantity
    
    // Recalculate totals
    const newTotal = updatedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const newCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Optimistically update UI immediately
    setCart({
      items: updatedItems,
      total: newTotal,
      count: newCount,
    });
    
    try {
      const token = await getToken();
      await cartAPI.updateCartItem(itemId, quantity, token ?? undefined);
      // Refresh to ensure consistency, but preserve order by using the existing order
      const freshCart = await cartAPI.getCart(token ?? undefined);
      
      // Create a map of fresh items by ID for quick lookup
      const freshItemsMap = new Map(freshCart.items.map((item) => [item.id, item]));
      
      // Preserve the order of items from the optimistic update
      const orderedItems = updatedItems
        .map((item) => {
          const freshItem = freshItemsMap.get(item.id);
          return freshItem || item;
        })
        .filter((item) => item.quantity > 0);
      
      // Add any new items that weren't in the previous cart (shouldn't happen, but just in case)
      const existingIds = new Set(orderedItems.map((item) => item.id));
      const newItems = freshCart.items.filter((item) => !existingIds.has(item.id));
      
      setCart({
        items: [...orderedItems, ...newItems],
        total: freshCart.total,
        count: freshCart.count,
      });
    } catch {
      setCart(previousCart);
      throw new Error('Failed to update cart');
    }
  }, [cart, getToken]);

  const removeItem = useCallback(async (itemId: string) => {
    const productId = cart?.items.find((i) => i.id === itemId)?.product.id;
    if (productId && busyRef.current.has(productId)) return;
    if (productId) markBusy(productId);

    const token = await getToken();
    try {
      await cartAPI.removeFromCart(itemId, token ?? undefined);
      await refreshCart();
    } catch {
      await refreshCart();
      throw new Error('Failed to remove item');
    } finally {
      if (productId) unmarkBusy(productId);
    }
  }, [refreshCart, getToken, cart, markBusy, unmarkBusy]);

  const clearCart = useCallback(async () => {
    const token = await getToken();
    try {
      await cartAPI.clearCart(token ?? undefined);
      await refreshCart();
    } catch {
      await refreshCart();
      throw new Error('Failed to clear cart');
    }
  }, [refreshCart, getToken]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        busyProductIds,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

