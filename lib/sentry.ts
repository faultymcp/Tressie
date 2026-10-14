// lib/sentry.ts
// Crash reports go to Sentry. The DSN only says where to send reports, so it
// is safe in the app (it isn't a secret key). No names or emails are sent.
// Without EXPO_PUBLIC_SENTRY_DSN in .env, Sentry stays off.

import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

export { Sentry };
