import { useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { keys } from './queries';
import type { Cart } from './types';

/**
 * Fetches the latest cart and a one-time signed-in checkout link for it.
 * Resolves to null when the cart is empty. Never cached: each link works once.
 */
export function useCheckoutSession() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['checkout-session'],
    queryFn: async () => {
      const cart = await qc.fetchQuery<Cart>({ queryKey: keys.cart, queryFn: api.getCart, staleTime: 0 });
      if (!cart.items.length) return null;
      return api.createWebSession('checkout', cart);
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
