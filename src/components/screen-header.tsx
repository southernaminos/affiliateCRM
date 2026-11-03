import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

/** On web the tab bar floats at the top of the page (24px from the top, 40px tall). */
const WEB_TAB_BAR_OFFSET = process.env.EXPO_OS === 'web' ? 72 : 0;

/** Large title for tab screens (tabs have no navigation header of their own). */
export function ScreenHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + WEB_TAB_BAR_OFFSET + Spacing.three }]}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
