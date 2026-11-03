import { FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProducts } from '@/lib/queries';
import type { ProductQuery } from '@/lib/api';

import { ProductCard } from './product-card';
import { Disclaimer, EmptyView, ErrorView, Loading } from './ui';

/** Infinite-scrolling product grid for any catalog query (all, search, category). */
export function ProductGrid({ query, header }: { query: Omit<ProductQuery, 'page'>; header?: React.ReactElement }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.min(4, Math.floor(Math.min(width, MaxContentWidth) / 180)));
  const q = useProducts(query);

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView message={q.error.message} onRetry={() => q.refetch()} />;

  const products = q.data.pages.flatMap((p) => p.products);

  return (
    <FlatList
      key={columns}
      data={products}
      numColumns={columns}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => (
        <View style={{ width: `${100 / columns}%`, padding: Spacing.two }}>
          <ProductCard product={item} />
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyView message={query.search ? 'No products match your search.' : 'No products here yet.'} />}
      ListFooterComponent={products.length ? <Disclaimer /> : undefined}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.accent} />}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
