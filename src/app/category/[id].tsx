import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ProductGrid } from '@/components/product-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeEntities } from '@/lib/format';
import { useCategories } from '@/lib/queries';

export default function CategoryScreen() {
  const t = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const categoryId = Number(id);
  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === categoryId);
  const children = categories?.filter((c) => c.parent === categoryId && c.count > 0) ?? [];
  const title = name ?? (category ? decodeEntities(category.name) : 'Category');

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      <ProductGrid
        query={{ category: categoryId }}
        header={
          children.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {children.map((c) => (
                <Link
                  key={c.id}
                  href={{ pathname: '/category/[id]', params: { id: String(c.id), name: decodeEntities(c.name) } }}
                  asChild>
                  <Pressable style={[styles.chip, { backgroundColor: t.backgroundElement }]}>
                    <ThemedText type="small">{decodeEntities(c.name)}</ThemedText>
                  </Pressable>
                </Link>
              ))}
            </ScrollView>
          ) : undefined
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 999 },
});
