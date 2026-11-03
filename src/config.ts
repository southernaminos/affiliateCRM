/**
 * Store settings. Override the URL per build with EXPO_PUBLIC_STORE_URL
 * (for example, to point a test build at a staging site).
 */
export const STORE_URL = (process.env.EXPO_PUBLIC_STORE_URL ?? 'https://southernaminos.com').replace(
  /\/+$/,
  ''
);

export const STORE_NAME = 'Southern Aminos';

/** Customers create accounts on the website; the app links here for sign-up and password resets. */
export const REGISTER_URL = `${STORE_URL}/my-account/`;
export const LOST_PASSWORD_URL = `${STORE_URL}/my-account/lost-password/`;

export const DISCLAIMER =
  'All products are sold strictly for laboratory research use only. Not for human or animal consumption.';
