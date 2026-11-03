# Southern Aminos Store App

A members-only shopping app for the Southern Aminos research store. It runs on iOS, Android and the web from one codebase (Expo + React Native + TypeScript).

Customers sign in with their existing store account, browse the catalog, manage a cart, and check out on the store's own WooCommerce checkout page, so payments keep going through the current gateway (Luqra) unchanged.

## How it works

| Piece | What it does |
| --- | --- |
| **WooCommerce Store API** (`/wp-json/wc/store/v1`) | Products, categories, variations, cart, coupons. Built into WooCommerce. |
| **JWT Authentication for WP REST API** (plugin) | Customer sign-in from the app. Returns a token the app sends with each request. |
| **Southern Aminos App Bridge** (`wp-plugin/sa-app-bridge`) | Turns the app session into a one-time link that signs the customer into the website, copies the cart over, and opens checkout or My Account. |

Checkout flow: **Cart → Checkout** → the app asks the bridge for a one-time link (valid 2 minutes, single use) → the store's checkout opens inside the app → the customer pays as usual → when WooCommerce shows the order-received page, the app clears its cart and shows a confirmation.

Customers create accounts and reset passwords on the website (`/my-account/`); the app links there.

## WordPress setup (one time)

1. **Install "JWT Authentication for WP REST API"** (by Enrique Chavez) from Plugins → Add New.
2. **Add a secret key to `wp-config.php`**, above the "That's all, stop editing!" line:
   ```php
   define( 'JWT_AUTH_SECRET_KEY', 'paste-a-long-random-string-here' );
   define( 'JWT_AUTH_CORS_ENABLE', true );
   ```
   Generate the string at https://api.wordpress.org/secret-key/1.1/salt/ (use any one value).
3. **Make sure the server passes the `Authorization` header to WordPress.** On Apache, add to `.htaccess` above the WordPress block:
   ```apache
   RewriteEngine on
   RewriteCond %{HTTP:Authorization} ^(.*)
   RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
   SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
   ```
   Many managed hosts already do this. If sign-in works but everything after it says "Sign in", this step is the cause.
4. **Install the bridge plugin:** zip the `wp-plugin/sa-app-bridge` folder and upload it in Plugins → Add New → Upload Plugin, then activate it.
5. **Check security/firewall plugins** (Wordfence, iThemes, Cloudflare rules, and the plugin that hides the store from logged-out visitors). They must allow:
   - `POST /wp-json/jwt-auth/v1/token`
   - `/wp-json/wc/store/v1/*` for signed-in requests
   - `/?sa_app_login=…` for logged-out visitors (it signs them in)

### Quick test after setup

```bash
# 1. Get a token (use a real customer account)
curl -X POST https://southernaminos.com/wp-json/jwt-auth/v1/token \
  -H 'Content-Type: application/json' -d '{"username":"you@example.com","password":"…"}'

# 2. Use it to list products
curl https://southernaminos.com/wp-json/wc/store/v1/products?per_page=2 \
  -H 'Authorization: Bearer <token from step 1>'
```

## Running the app

```bash
npm install
npx expo start          # press i (iOS simulator, Mac only), a (Android), or w (web)
```

To try it on an iPhone without a Mac, install the **Expo Go** app and scan the QR code from `npx expo start`. (The in-app checkout uses `react-native-webview`, which Expo Go includes.)

Point the app at a different site (for example, staging):

```bash
EXPO_PUBLIC_STORE_URL=https://staging.southernaminos.com npx expo start
```

Checks:

```bash
npm run typecheck
npm run lint
```

## Building for the App Store / TestFlight

Builds run in Expo's cloud, so no Mac is needed:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
npx eas-cli@latest submit --platform ios      # uploads to App Store Connect / TestFlight
```

Bundle identifier: `com.southernaminos.store` (change it in `app.json` before the first build if you prefer another).

**App Review note:** Apple is strict about apps that sell peptides and other "research use only" products, so rejection is a real possibility. Reviewers will also need a working demo customer account, because the store requires sign-in. If iOS approval fails, the web build below is the fallback.

## Web version (installable web app)

```bash
npx expo export --platform web     # outputs static files to dist/
```

Upload `dist/` to any static host. Hosting it on the same domain (for example `southernaminos.com/app/`) avoids cross-site (CORS) issues; the bridge plugin also exposes the headers the app needs if it's hosted elsewhere. On web, checkout opens in the same browser tab instead of inside the app.

## Project layout

```
src/
  app/                    screens (Expo Router: each file is a route)
    _layout.tsx           providers + sign-in gate
    login.tsx
    (tabs)/               Shop, Categories, Cart, Account
    product/[id].tsx      product detail, variation picker, add to cart
    category/[id].tsx
    checkout.tsx          in-app WooCommerce checkout (checkout.web.tsx for web)
    order-complete.tsx
  components/             shared UI
  lib/
    api.ts                all HTTP calls (Store API, JWT, bridge)
    auth.tsx              sign-in state, token kept in the device keychain
    queries.ts            data fetching + caching (TanStack Query)
    variations.ts         matches selected options to a WooCommerce variation
  config.ts               store URL, name, research-use disclaimer
wp-plugin/sa-app-bridge/  WordPress plugin for the checkout hand-off
```
