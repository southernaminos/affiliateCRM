import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Disclaimer, EmptyView, ErrorView, Input, Loading, QuantityStepper } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { decodeEntities, formatMoney } from '@/lib/format';
import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from '@/lib/queries';
import type { Cart, CartItem } from '@/lib/types';

export default function CartScreen() {
  const t = useTheme();
  const q = useCart();

  let body: React.ReactNode;
  if (q.isPending) body = <Loading />;
  else if (q.isError) body = <ErrorView message={q.error.message} onRetry={() => q.refetch()} />;
  else if (q.data.items.length === 0)
    body = (
      <EmptyView message="Your cart is empty.">
        <Button title="Browse products" variant="secondary" onPress={() => router.navigate('/')} />
      </EmptyView>
    );
  else
    body = (
      <FlatList
        data={q.data.items}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => <CartRow item={item} />}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: t.border }]} />}
        ListFooterComponent={<CartSummary cart={q.data} />}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.accent} />}
      />
    );

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenHeader title="Cart" />
      {body}
    </ThemedView>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const t = useTheme();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const busy = update.isPending || remove.isPending;
  const image = item.images[0];
  const limits = item.quantity_limits;

  return (
    <View style={[styles.row, { opacity: busy ? 0.6 : 1 }]}>
      <View style={[styles.thumb, { backgroundColor: t.backgroundElement }]}>
        {image && <Image source={image.thumbnail || image.src} style={styles.thumbImg} />}
      </View>
      <View style={{ flex: 1, gap: Spacing.one }}>
        <ThemedText type="small" numberOfLines={2}>
          {decodeEntities(item.name)}
        </ThemedText>
        {item.variation.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.variation.map((v) => `${decodeEntities(v.attribute)}: ${decodeEntities(v.value)}`).join(' · ')}
          </ThemedText>
        )}
        <ThemedText type="smallBold">{formatMoney(item.totals.line_subtotal, item.totals)}</ThemedText>
        <View style={styles.rowActions}>
          {limits.editable ? (
            <QuantityStepper
              value={item.quantity}
              min={Math.max(1, limits.minimum)}
              max={limits.maximum}
              disabled={busy}
              onChange={(quantity) => update.mutate({ key: item.key, quantity })}
            />
          ) : (
            <ThemedText type="small">Qty {item.quantity}</ThemedText>
          )}
          <Pressable onPress={() => remove.mutate(item.key)} disabled={busy} hitSlop={8}>
            <ThemedText type="small" style={{ color: t.danger }}>
              Remove
            </ThemedText>
          </Pressable>
        </View>
        {(update.error || remove.error) && (
          <ThemedText type="small" style={{ color: t.danger }}>
            {(update.error ?? remove.error)?.message}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function CartSummary({ cart }: { cart: Cart }) {
  const t = useTheme();
  const [code, setCode] = useState('');
  const apply = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const totals = cart.totals;

  return (
    <View style={styles.summary}>
      {cart.errors.map((e) => (
        <ThemedText key={e.code} type="small" style={{ color: t.danger }}>
          {decodeEntities(e.message.replace(/<[^>]+>/g, ''))}
        </ThemedText>
      ))}

      <View style={styles.couponRow}>
        <Input
          placeholder="Coupon code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button
          title="Apply"
          variant="secondary"
          style={{ flexShrink: 0 }}
          disabled={!code.trim()}
          loading={apply.isPending}
          onPress={() => apply.mutate(code.trim(), { onSuccess: () => setCode('') })}
        />
      </View>
      {apply.isError && (
        <ThemedText type="small" style={{ color: t.danger }}>
          {apply.error.message}
        </ThemedText>
      )}
      {cart.coupons.map((c) => (
        <View key={c.code} style={styles.line}>
          <ThemedText type="small">Coupon “{c.code}”</ThemedText>
          <Pressable onPress={() => removeCoupon.mutate(c.code)} hitSlop={8}>
            <ThemedText type="small" style={{ color: t.danger }}>
              Remove
            </ThemedText>
          </Pressable>
        </View>
      ))}

      <View style={[styles.totals, { backgroundColor: t.backgroundElement }]}>
        <Line label="Subtotal" value={formatMoney(totals.total_items, totals)} />
        {Number(totals.total_discount) > 0 && (
          <Line label="Discount" value={`-${formatMoney(totals.total_discount, totals)}`} />
        )}
        {cart.needs_shipping && (
          <Line
            label="Shipping"
            value={totals.total_shipping == null ? 'Calculated at checkout' : formatMoney(totals.total_shipping, totals)}
          />
        )}
        {Number(totals.total_tax) > 0 && <Line label="Tax" value={formatMoney(totals.total_tax, totals)} />}
        <View style={[styles.sepFull, { backgroundColor: t.border }]} />
        <Line label="Total" value={formatMoney(totals.total_price, totals)} bold />
      </View>

      <Button title="Checkout" onPress={() => router.push('/checkout')} />
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        You’ll confirm shipping and pay securely on our checkout page.
      </ThemedText>
      <Disclaimer />
    </View>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <ThemedText type={bold ? 'smallBold' : 'small'}>{label}</ThemedText>
      <ThemedText type={bold ? 'smallBold' : 'small'}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  thumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  sepFull: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  summary: { padding: Spacing.three, gap: Spacing.three },
  couponRow: { flexDirection: 'row', gap: Spacing.two },
  totals: { padding: Spacing.three, borderRadius: 12, gap: Spacing.two },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
