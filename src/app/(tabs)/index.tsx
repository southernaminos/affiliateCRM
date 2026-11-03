import { useEffect, useState } from 'react';

import { ProductGrid } from '@/components/product-grid';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui';
import { STORE_NAME } from '@/config';

export default function ShopScreen() {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  // Wait for the customer to pause typing before searching.
  useEffect(() => {
    const id = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScreenHeader title={STORE_NAME}>
        <Input
          placeholder="Search products"
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search products"
        />
      </ScreenHeader>
      <ProductGrid query={{ search: search || undefined, orderby: search ? undefined : 'menu_order' }} />
    </ThemedView>
  );
}
