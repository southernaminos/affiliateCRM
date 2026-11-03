import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyView, ErrorView, Loading } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeEntities } from '@/lib/format';
import { useCategories } from '@/lib/queries';

export default function CategoriesScreen() {
  const t = useTheme();
  const q = useCategories();

  let body: React.ReactNode;
  if (q.isPending) body = <Loading />;
  else if (q.isError) body = <ErrorView message={q.error.message} onRetry={() => q.refetch()} />;
  else {
    const top = q.data.filter((c) => c.parent === 0 && c.count > 0 && c.slug !== 'uncategorized');
    body = (
      <FlatList
        data={top}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        ListEmptyComponent={<EmptyView message="No categories yet." />}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: t.border }]} />}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/category/[id]', params: { id: String(item.id), name: decodeEntities(item.name) } }}
            asChild>
            <Pressable style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.thumb, { backgroundColor: t.backgroundElement }]}>
                {item.image && <Image source={item.image.thumbnail || item.image.src} style={styles.thumbImg} />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText>{decodeEntities(item.name)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.count} {item.count === 1 ? 'product' : 'products'}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary">›</ThemedText>
            </Pressable>
          </Link>
        )}
      />
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenHeader title="Categories" />
      {body}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.five },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three + 56 + Spacing.three },
});
