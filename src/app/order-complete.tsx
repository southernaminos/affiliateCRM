import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOpenWebPage } from '@/lib/web-pages';

export default function OrderCompleteScreen() {
  const t = useTheme();
  const { order } = useLocalSearchParams<{ order?: string }>();
  const openWeb = useOpenWebPage();

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.wrap}>
        <View style={[styles.check, { backgroundColor: t.success }]}>
          <ThemedText style={{ color: '#fff', fontSize: 40, lineHeight: 48 }}>✓</ThemedText>
        </View>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          Thank you!
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {order ? `Your order #${order} has been placed.` : 'Your order has been placed.'} A confirmation email is on
          its way.
        </ThemedText>
        <View style={styles.actions}>
          <Button title="Continue shopping" onPress={() => router.replace('/')} />
          <Button
            title="View my orders"
            variant="secondary"
            loading={openWeb.isPending}
            onPress={() => openWeb.mutate('orders')}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  check: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', maxWidth: 440, width: '100%', marginHorizontal: 'auto', gap: Spacing.three, marginTop: Spacing.four },
});
