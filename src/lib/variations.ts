import { decodeEntities } from './format';
import type { Product, ProductAttribute } from './types';

/** attribute name -> selected term slug */
export type Selection = Record<string, string>;

const norm = (s: string) => decodeEntities(s).toLowerCase().trim();

/** Attributes the customer has to choose (e.g. "Size: 5mg / 10mg"). */
export function variationAttributes(product: Product): ProductAttribute[] {
  return product.type === 'variable' ? product.attributes.filter((a) => a.has_variations && a.terms.length) : [];
}

/** Preselect store defaults, or the only option when there is just one. */
export function defaultSelection(product: Product): Selection {
  const sel: Selection = {};
  for (const attr of variationAttributes(product)) {
    const term = attr.terms.find((t) => t.default) ?? (attr.terms.length === 1 ? attr.terms[0] : undefined);
    if (term) sel[attr.name] = term.slug;
  }
  return sel;
}

function attributeFor(product: Product, name: string) {
  const n = norm(name);
  return product.attributes.find(
    (a) => norm(a.name) === n || (a.taxonomy && (norm(a.taxonomy) === n || `attribute_${norm(a.taxonomy)}` === n))
  );
}

/**
 * Finds the variation matching the selection. A variation attribute with an empty value means
 * "any" in WooCommerce. Values may be term slugs or names depending on the attribute type.
 */
export function findVariationId(product: Product, selection: Selection): number | null {
  const attrs = variationAttributes(product);
  if (attrs.some((a) => !selection[a.name])) return null;

  const match = product.variations.find((v) =>
    v.attributes.every((va) => {
      if (!va.value) return true;
      const attr = attributeFor(product, va.name);
      if (!attr) return false;
      const term = attr.terms.find((t) => t.slug === selection[attr.name]);
      return !!term && (norm(va.value) === norm(term.slug) || norm(va.value) === norm(term.name));
    })
  );
  return match?.id ?? null;
}
