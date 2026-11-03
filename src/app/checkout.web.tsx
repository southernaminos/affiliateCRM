import { router } from 'expo-router';
import { useEffect } from 'react';

import { ErrorView, Loading } from '@/components/ui';
import { useCheckoutSession } from '@/lib/checkout-session';

/**
 * Web build: browsers can't embed the checkout page and watch it the way the native app does,
 * so send the customer straight to the store's checkout (signed in, with their cart).
 */
export default function CheckoutScreen() {
  const session = useCheckoutSession();

  useEffect(() => {
    if (session.data === null) router.back();
    else if (session.data) window.location.assign(session.data);
  }, [session.data]);

  if (session.isError) return <ErrorView message={session.error.message} onRetry={() => void session.refetch()} />;
  return <Loading />;
}
