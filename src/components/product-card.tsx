import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeEntities, formatProductPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

import { ThemedText } from './themed-text';

export function ProductCard({ product }: { product: Product }) {
  const t = useTheme();
  const image = product.images[0];
  return (
    <Link href={{ pathname: '/product/[id]', params: { id: String(product.id) } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={[styles.imageWrap, { backgroundColor: t.backgroundElement }]}>
          {image ? (
            <Image
              source={image.thumbnail || image.src}
              alt={image.alt || product.name}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          {product.on_sale && (
            <View style={[styles.badge, { backgroundColor: t.accent }]}>
              <ThemedText type="smallBold" style={{ color: t.onAccent, fontSize: 12 }}>
                Sale
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="small" numberOfLines={2} style={styles.name}>
          {decodeEntities(product.name)}
        </ThemedText>
        <ThemedText type="smallBold">{formatProductPrice(product.prices)}</ThemedText>
        {!product.is_in_stock && (
          <ThemedText type="small" style={{ color: t.danger }}>
            Out of stock
          </ThemedText>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing.one,
  },
  imageWrap: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 6,
  },
  name: { marginTop: Spacing.one },
});
