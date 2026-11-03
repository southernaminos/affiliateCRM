import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Disclaimer } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useOpenWebPage } from '@/lib/web-pages';

export default function AccountScreen() {
  const t = useTheme();
  const { user, signOut } = useAuth();
  const openWeb = useOpenWebPage();
  const pending = openWeb.isPending ? openWeb.variables : null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenHeader title="Account" />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={[styles.card, { backgroundColor: t.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ fontSize: 18 }}>
            {user?.displayName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {user?.email}
          </ThemedText>
        </View>

        <View style={{ gap: Spacing.three }}>
          <Button
            title="My orders"
            variant="secondary"
            loading={pending === 'orders'}
            onPress={() => openWeb.mutate('orders')}
          />
          <Button
            title="Addresses & account details"
            variant="secondary"
            loading={pending === 'account'}
            onPress={() => openWeb.mutate('account')}
          />
        </View>

        <Button title="Sign out" variant="danger" onPress={signOut} />
        <Disclaimer />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: { padding: Spacing.three, borderRadius: 12, gap: Spacing.one },
});
