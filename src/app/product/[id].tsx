import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Disclaimer, ErrorView, Loading, QuantityStepper } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeEntities, formatProductPrice, htmlToText } from '@/lib/format';
import { useAddToCart, useProduct } from '@/lib/queries';
import type { Product } from '@/lib/types';
import { defaultSelection, findVariationId, variationAttributes, type Selection } from '@/lib/variations';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useProduct(Number(id));

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView message={q.error.message} onRetry={() => q.refetch()} />;
  return <ProductDetail product={q.data} />;
}

function ProductDetail({ product }: { product: Product }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MaxContentWidth);

  const attrs = variationAttributes(product);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(product));
  const variationId = attrs.length ? findVariationId(product, selection) : null;
  const allChosen = attrs.every((a) => selection[a.name]);
  const variation = useProduct(variationId ?? undefined);

  // The chosen variation supplies its own price, stock and (sometimes) image.
  const active = variationId && variation.data ? variation.data : product;
  const purchasableId = attrs.length ? variationId : product.id;

  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  // Only show add-to-cart feedback for the option currently selected.
  const forCurrent = addToCart.variables?.id === purchasableId;
  const added = forCurrent && addToCart.isSuccess;
  const addError = forCurrent && addToCart.isError ? addToCart.error : null;

  const images = useMemo(() => {
    const variationImages = variationId && variation.data ? variation.data.images : [];
    const seen = new Set<string>();
    return [...variationImages, ...product.images].filter((i) => !seen.has(i.src) && seen.add(i.src));
  }, [product.images, variation.data, variationId]);

  const maxQty = active.add_to_cart?.maximum && active.add_to_cart.maximum > 0 ? active.add_to_cart.maximum : undefined;
  const canBuy =
    !!purchasableId && active.is_purchasable && (active.is_in_stock || active.is_on_backorder) && !variation.isFetching;

  let status: string | null = null;
  if (attrs.length && !allChosen) status = `Choose ${attrs.map((a) => decodeEntities(a.name).toLowerCase()).join(' and ')}`;
  else if (attrs.length && !variationId) status = 'This combination is not available.';
  else if (!active.is_in_stock && !active.is_on_backorder) status = 'Out of stock';

  const description = htmlToText(product.description || product.short_description);
  const shortDescription = product.description ? htmlToText(product.short_description) : '';

  function onAdd() {
    if (purchasableId) addToCart.mutate({ id: purchasableId, quantity });
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: decodeEntities(product.name) }} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}>
        {images.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: contentWidth }}>
            {images.map((img) => (
              <Image
                key={img.id || img.src}
                source={img.src}
                alt={img.alt || product.name}
                style={{ width: contentWidth, height: contentWidth, backgroundColor: t.backgroundElement }}
                contentFit="contain"
                transition={150}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.body}>
          <View style={{ gap: Spacing.one }}>
            <ThemedText type="subtitle" style={styles.title}>
              {decodeEntities(product.name)}
            </ThemedText>
            <ThemedText style={styles.price}>{formatProductPrice(active.prices)}</ThemedText>
            {active.sku ? (
              <ThemedText type="small" themeColor="textSecondary">
                SKU: {active.sku}
              </ThemedText>
            ) : null}
          </View>

          {shortDescription ? <ThemedText themeColor="textSecondary">{shortDescription}</ThemedText> : null}

          {attrs.map((attr) => (
            <View key={attr.id || attr.name} style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold">{decodeEntities(attr.name)}</ThemedText>
              <View style={styles.options}>
                {attr.terms.map((term) => {
                  const selected = selection[attr.name] === term.slug;
                  return (
                    <Pressable
                      key={term.slug}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setSelection((s) => ({ ...s, [attr.name]: term.slug }))}
                      style={[
                        styles.option,
                        {
                          borderColor: selected ? t.accent : t.border,
                          backgroundColor: selected ? t.backgroundSelected : t.backgroundElement,
                        },
                      ]}>
                      <ThemedText type="small">{decodeEntities(term.name)}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {active.low_stock_remaining ? (
            <ThemedText type="small" style={{ color: t.danger }}>
              Only {active.low_stock_remaining} left
            </ThemedText>
          ) : null}

          {status && (
            <ThemedText type="small" themeColor="textSecondary">
              {status}
            </ThemedText>
          )}

          <View style={styles.buyRow}>
            {!active.sold_individually && (
              <QuantityStepper value={quantity} max={maxQty} onChange={setQuantity} disabled={!canBuy} />
            )}
            <Button
              title="Add to cart"
              onPress={onAdd}
              disabled={!canBuy}
              loading={addToCart.isPending}
              style={{ flex: 1 }}
            />
          </View>

          {addError && (
            <ThemedText type="small" style={{ color: t.danger }}>
              {addError.message}
            </ThemedText>
          )}
          {added && (
            <View style={[styles.added, { backgroundColor: t.backgroundElement }]}>
              <ThemedText type="small" style={{ color: t.success, flex: 1 }}>
                Added to your cart
              </ThemedText>
              <Pressable onPress={() => router.navigate('/cart')}>
                <ThemedText type="smallBold" style={{ color: t.accent }}>
                  View cart
                </ThemedText>
              </Pressable>
            </View>
          )}

          {description ? (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold">Description</ThemedText>
              <ThemedText>{description}</ThemedText>
            </View>
          ) : null}

          <Disclaimer />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  body: { padding: Spacing.three, gap: Spacing.four },
  title: { fontSize: 26, lineHeight: 32 },
  price: { fontSize: 20, fontWeight: 700 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 10, borderWidth: 1.5 },
  buyRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  added: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: 10 },
});
