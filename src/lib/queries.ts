import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import type { Cart } from './types';

export const keys = {
  products: (q: Omit<api.ProductQuery, 'page'>) => ['products', q] as const,
  product: (id: number) => ['product', id] as const,
  categories: ['categories'] as const,
  cart: ['cart'] as const,
};

export function useProducts(q: Omit<api.ProductQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: keys.products(q),
    queryFn: ({ pageParam }) => api.getProducts({ ...q, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: keys.product(id ?? 0),
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: api.getCategories, staleTime: 10 * 60_000 });
}

export function useCart() {
  return useQuery({ queryKey: keys.cart, queryFn: api.getCart, staleTime: 0 });
}

/** Every cart endpoint returns the full updated cart, so write it straight into the cache. */
function useCartMutation<V>(fn: (v: V) => Promise<Cart>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => qc.setQueryData(keys.cart, cart),
    onError: () => qc.invalidateQueries({ queryKey: keys.cart }),
  });
}

export const useAddToCart = () =>
  useCartMutation(({ id, quantity }: { id: number; quantity: number }) => api.addToCart(id, quantity));
export const useUpdateCartItem = () =>
  useCartMutation(({ key, quantity }: { key: string; quantity: number }) => api.updateCartItem(key, quantity));
export const useRemoveCartItem = () => useCartMutation((key: string) => api.removeCartItem(key));
export const useApplyCoupon = () => useCartMutation((code: string) => api.applyCoupon(code));
export const useRemoveCoupon = () => useCartMutation((code: string) => api.removeCoupon(code));
