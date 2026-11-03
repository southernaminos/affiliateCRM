/** Web fallback: SecureStore is not available in browsers, so use localStorage. */
function store(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const secureStorage = {
  get: async (key: string) => store()?.getItem(key) ?? null,
  set: async (key: string, value: string) => {
    store()?.setItem(key, value);
  },
  remove: async (key: string) => {
    store()?.removeItem(key);
  },
};
