import type { CurrencyInfo, ProductPrices } from './types';

/** Store API amounts are integers in minor units (e.g. "1999" = $19.99). */
export function formatMoney(amount: string | number | null | undefined, c: CurrencyInfo): string {
  const minor = Number(amount ?? 0);
  const value = minor / 10 ** c.currency_minor_unit;
  const [int, dec] = Math.abs(value).toFixed(c.currency_minor_unit).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, c.currency_thousand_separator);
  const body = dec ? `${grouped}${c.currency_decimal_separator}${dec}` : grouped;
  return `${value < 0 ? '-' : ''}${c.currency_prefix}${body}${c.currency_suffix}`;
}

/** "$10.00" or "$10.00 – $45.00" for variable products. */
export function formatProductPrice(p: ProductPrices): string {
  if (p.price_range && p.price_range.min_amount !== p.price_range.max_amount) {
    return `${formatMoney(p.price_range.min_amount, p)} – ${formatMoney(p.price_range.max_amount, p)}`;
  }
  return formatMoney(p.price_range?.min_amount ?? p.price, p);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  trade: '™',
  reg: '®',
  copy: '©',
  deg: '°',
  micro: 'µ',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Converts WooCommerce HTML descriptions to readable plain text with paragraph breaks. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|tr|table)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
