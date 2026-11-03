/** Shapes returned by the WooCommerce Store API (/wp-json/wc/store/v1). Only fields the app uses. */

export interface CurrencyInfo {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface ProductPrices extends CurrencyInfo {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: { min_amount: string; max_amount: string } | null;
}

export interface ProductImage {
  id: number;
  src: string;
  thumbnail: string;
  alt: string;
  name: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: { id: number; name: string; slug: string; default?: boolean }[];
}

export interface ProductVariationRef {
  id: number;
  attributes: { name: string; value: string }[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: 'simple' | 'variable' | 'variation' | 'grouped' | 'external' | string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: ProductPrices;
  images: ProductImage[];
  categories: { id: number; name: string; slug: string }[];
  attributes: ProductAttribute[];
  variations: ProductVariationRef[];
  has_options: boolean;
  is_purchasable: boolean;
  is_in_stock: boolean;
  is_on_backorder: boolean;
  low_stock_remaining: number | null;
  sold_individually: boolean;
  add_to_cart: { minimum: number; maximum: number; multiple_of: number };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: { src: string; thumbnail: string; alt: string } | null;
}

export interface CartItem {
  key: string;
  /** Product ID, or the variation ID for variable products. */
  id: number;
  quantity: number;
  quantity_limits: { minimum: number; maximum: number; multiple_of: number; editable: boolean };
  name: string;
  images: ProductImage[];
  variation: { attribute: string; value: string }[];
  prices: ProductPrices;
  totals: CurrencyInfo & { line_subtotal: string; line_total: string };
}

export interface Cart {
  items: CartItem[];
  items_count: number;
  coupons: { code: string; totals: CurrencyInfo & { total_discount: string } }[];
  needs_shipping: boolean;
  totals: CurrencyInfo & {
    total_items: string;
    total_discount: string;
    total_shipping: string | null;
    total_tax: string;
    total_price: string;
  };
  errors: { code: string; message: string }[];
}

export interface User {
  token: string;
  email: string;
  displayName: string;
}
