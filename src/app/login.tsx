import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Disclaimer, Input } from '@/components/ui';
import { LOST_PASSWORD_URL, REGISTER_URL, STORE_NAME } from '@/config';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const t = useTheme();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username || !password) {
      setError('Enter your email or username and your password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                {STORE_NAME}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Sign in with your store account to browse and order.
              </ThemedText>
            </View>

            <View style={styles.form}>
              <Input
                placeholder="Email or username"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                keyboardType="email-address"
                value={username}
                onChangeText={setUsername}
                returnKeyType="next"
              />
              <Input
                placeholder="Password"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {error && (
                <ThemedText type="small" style={{ color: t.danger }} accessibilityLiveRegion="polite">
                  {error}
                </ThemedText>
              )}
              <Button title="Sign in" onPress={submit} loading={busy} />
              <Pressable onPress={() => openBrowserAsync(LOST_PASSWORD_URL)} style={styles.link}>
                <ThemedText type="small" style={{ color: t.accent }}>
                  Forgot your password?
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.form}>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                New customer?
              </ThemedText>
              <Button title="Create an account" variant="secondary" onPress={() => openBrowserAsync(REGISTER_URL)} />
            </View>

            <Disclaimer />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  hero: { gap: Spacing.two },
  form: { gap: Spacing.three },
  link: { alignSelf: 'center', padding: Spacing.one },
});
