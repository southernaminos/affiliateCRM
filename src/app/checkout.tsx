import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';
import { ErrorView, Loading } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import * as api from '@/lib/api';
import { useCheckoutSession } from '@/lib/checkout-session';
import { keys } from '@/lib/queries';

/** WooCommerce's thank-you page: /checkout/order-received/<order id>/?key=... */
const ORDER_RECEIVED = /\/order-received\/(\d+)/;

/**
 * Opens the store's own checkout page in-app, signed in as the customer with their cart.
 * Payment (Luqra or any other WooCommerce gateway) happens on the website exactly as it does today.
 */
export default function CheckoutScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const session = useCheckoutSession();
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (session.data === null) router.back(); // cart is empty
  }, [session.data]);

  function onNavigation(nav: WebViewNavigation) {
    const match = nav.url.match(ORDER_RECEIVED);
    if (!match || done.current) return;
    done.current = true;
    // The order is placed; empty the app's cart and show the confirmation.
    api
      .clearCart()
      .catch(() => {})
      .finally(() => qc.invalidateQueries({ queryKey: keys.cart }));
    router.replace({ pathname: '/order-complete', params: { order: match[1] } });
  }

  function retry() {
    setPageError(null);
    void session.refetch();
  }

  if (session.isError || pageError) {
    return <ErrorView message={pageError ?? session.error?.message ?? 'Could not start checkout.'} onRetry={retry} />;
  }
  if (!session.data || session.isFetching) return <Loading />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <WebView
        source={{ uri: session.data }}
        onNavigationStateChange={onNavigation}
        onLoadStart={() => setPageLoading(true)}
        onLoadEnd={() => setPageLoading(false)}
        onError={(e) => setPageError(e.nativeEvent.description || 'The checkout page failed to load.')}
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: t.background }}
      />
      {pageLoading && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
