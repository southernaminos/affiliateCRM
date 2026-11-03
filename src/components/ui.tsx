import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';

import { DISCLAIMER } from '@/config';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : t.backgroundElement;
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.text;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : state.pressed ? 0.8 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type="smallBold" style={{ color: fg, fontSize: 16 }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textSecondary}
      {...props}
      style={[styles.input, { color: t.text, backgroundColor: t.backgroundElement, borderColor: t.border }, props.style]}
    />
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={t.accent} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { gap: Spacing.three }]}>
      <ThemedText style={{ textAlign: 'center' }} themeColor="textSecondary">
        {message}
      </ThemedText>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function EmptyView({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <View style={[styles.center, { gap: Spacing.three }]}>
      <ThemedText style={{ textAlign: 'center' }} themeColor="textSecondary">
        {message}
      </ThemedText>
      {children}
    </View>
  );
}

export function Disclaimer() {
  const t = useTheme();
  return (
    <View style={[styles.disclaimer, { borderColor: t.border }]}>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {DISCLAIMER}
      </ThemedText>
    </View>
  );
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  const canDec = !disabled && value > min;
  const canInc = !disabled && (max === undefined || max <= 0 || value < max);
  return (
    <View style={[styles.stepper, { backgroundColor: t.backgroundElement }]}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        disabled={!canDec}
        onPress={() => onChange(value - 1)}
        style={[styles.stepBtn, { opacity: canDec ? 1 : 0.3 }]}>
        <ThemedText type="smallBold" style={{ fontSize: 18 }}>
          −
        </ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.stepValue}>
        {value}
      </ThemedText>
      <Pressable
        accessibilityLabel="Increase quantity"
        disabled={!canInc}
        onPress={() => onChange(value + 1)}
        style={[styles.stepBtn, { opacity: canInc ? 1 : 0.3 }]}>
        <ThemedText type="smallBold" style={{ fontSize: 18 }}>
          +
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  disclaimer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
  },
});
