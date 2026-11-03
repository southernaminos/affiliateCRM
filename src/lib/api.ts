import { STORE_URL } from '@/config';

import { decodeEntities } from './format';
import type { Cart, Category, Product } from './types';

/**
 * Talks to three groups of WordPress endpoints:
 *  - WooCommerce Store API  (/wc/store/v1)  catalog + cart
 *  - JWT Authentication     (/jwt-auth/v1)  customer sign-in   (plugin: "JWT Authentication for WP REST API")
 *  - App bridge             (/sa-app/v1)    hands the cart to web checkout (plugin in /wp-plugin)
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let storeNonce: string | null = null;
let cartToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  // A new identity means a new cart session.
  storeNonce = null;
  cartToken = null;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  auth?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${STORE_URL}/wp-json${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; headers: Headers }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && authToken) headers.Authorization = `Bearer ${authToken}`;
  if (path.startsWith('/wc/store')) {
    if (storeNonce) headers.Nonce = storeNonce;
    if (cartToken) headers['Cart-Token'] = cartToken;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the store. Check your connection and try again.', 0);
  }

  // The Store API hands back a fresh nonce / cart token on each response; reuse them for cart writes.
  const nonce = res.headers.get('Nonce') ?? res.headers.get('X-WC-Store-API-Nonce');
  if (nonce) storeNonce = nonce;
  const ct = res.headers.get('Cart-Token');
  if (ct) cartToken = ct;

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON usually means a security plugin or the login wall intercepted the request.
    throw new ApiError('The store returned an unexpected response.', res.status);
  }

  if (!res.ok) {
    const code: string | undefined = data?.code;
    const message = decodeEntities(String(data?.message ?? `Request failed (${res.status})`).replace(/<[^>]+>/g, ''));
    const tokenProblem = code?.startsWith('jwt_auth') && code !== 'jwt_auth_failed';
    if (authToken && (res.status === 401 || tokenProblem)) onUnauthorized?.();
    throw new ApiError(message, res.status, code);
  }
  return { data: data as T, headers: res.headers };
}

// ---------- Auth ----------

export async function login(username: string, password: string) {
  const { data } = await request<{ token: string; user_email: string; user_display_name: string }>(
    '/jwt-auth/v1/token',
    { method: 'POST', body: { username, password }, auth: false }
  );
  return { token: data.token, email: data.user_email, displayName: decodeEntities(data.user_display_name) };
}

export async function validateToken() {
  await request('/jwt-auth/v1/token/validate', { method: 'POST' });
}

// ---------- Catalog ----------

export interface ProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  category?: number;
  featured?: boolean;
  orderby?: 'date' | 'popularity' | 'price' | 'title' | 'menu_order';
  order?: 'asc' | 'desc';
}

export async function getProducts(q: ProductQuery = {}) {
  const { data, headers } = await request<Product[]>('/wc/store/v1/products', {
    query: {
      page: q.page ?? 1,
      per_page: q.perPage ?? 20,
      search: q.search,
      category: q.category,
      featured: q.featured,
      orderby: q.orderby,
      order: q.order,
    },
  });
  const totalPages = Number(headers.get('X-WP-TotalPages') ?? 1);
  return { products: data, page: q.page ?? 1, totalPages };
}

export async function getProduct(id: number) {
  return (await request<Product>(`/wc/store/v1/products/${id}`)).data;
}

export async function getCategories() {
  const { data } = await request<Category[]>('/wc/store/v1/products/categories', { query: { per_page: 100 } });
  return data;
}

// ---------- Cart ----------

export async function getCart() {
  return (await request<Cart>('/wc/store/v1/cart')).data;
}

export async function addToCart(id: number, quantity: number) {
  return (await request<Cart>('/wc/store/v1/cart/add-item', { method: 'POST', body: { id, quantity } })).data;
}

export async function updateCartItem(key: string, quantity: number) {
  return (await request<Cart>('/wc/store/v1/cart/update-item', { method: 'POST', body: { key, quantity } })).data;
}

export async function removeCartItem(key: string) {
  return (await request<Cart>('/wc/store/v1/cart/remove-item', { method: 'POST', body: { key } })).data;
}

export async function applyCoupon(code: string) {
  return (await request<Cart>('/wc/store/v1/cart/apply-coupon', { method: 'POST', body: { code } })).data;
}

export async function removeCoupon(code: string) {
  return (await request<Cart>('/wc/store/v1/cart/remove-coupon', { method: 'POST', body: { code } })).data;
}

export async function clearCart() {
  await request('/wc/store/v1/cart/items', { method: 'DELETE' });
}

// ---------- Web hand-off (sa-app-bridge plugin) ----------

export type WebDestination = 'checkout' | 'orders' | 'account';

/**
 * Asks the site for a one-time link that signs the customer into the website and opens the
 * given page. For checkout, the app's cart lines and coupons are copied into the web cart.
 */
export async function createWebSession(destination: WebDestination, cart?: Cart) {
  const { data } = await request<{ url: string }>('/sa-app/v1/web-session', {
    method: 'POST',
    body: {
      destination,
      items: cart?.items.map((i) => ({ id: i.id, quantity: i.quantity })) ?? [],
      coupons: cart?.coupons.map((c) => c.code) ?? [],
      // In the native app the page is shown inside the app, so the site hides its header/footer.
      embedded: process.env.EXPO_OS !== 'web',
    },
  });
  return data.url;
}
