import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { cartAPI, Cart, CartItem } from '@/lib/api/cart';
import { useAuth } from '@/hooks/use-auth';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setLoading(false);
      return;
    }

    try {
      const cartData = await cartAPI.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      await cartAPI.addToCart(productId, quantity);
      await refreshCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }, [refreshCart]);

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
      await cartAPI.updateCartItem(itemId, quantity);
      // Refresh to ensure consistency, but preserve order by using the existing order
      const freshCart = await cartAPI.getCart();
      
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
    } catch (error) {
      // Revert to previous state on error
      setCart(previousCart);
      console.error('Error updating cart:', error);
      throw error;
    }
  }, [cart]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      await cartAPI.removeFromCart(itemId);
      await refreshCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    try {
      await cartAPI.clearCart();
      await refreshCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
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

