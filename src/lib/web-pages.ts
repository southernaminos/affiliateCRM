import { useMutation } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

import { createWebSession, type WebDestination } from './api';

/** Opens a My Account page on the website, already signed in, in an in-app browser. */
export function useOpenWebPage() {
  return useMutation({
    mutationFn: async (destination: Exclude<WebDestination, 'checkout'>) => {
      const url = await createWebSession(destination);
      await openBrowserAsync(url);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Could not open that page.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Something went wrong', msg);
    },
  });
}
