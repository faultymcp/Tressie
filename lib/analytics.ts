// lib/analytics.ts
// A handful of anonymous usage events, sent to PostHog's EU servers.
// No names, emails or photos, and no user ID: each install is just a random ID.
// People can switch it off in Settings. Without EXPO_PUBLIC_POSTHOG_KEY in .env,
// nothing is sent.

import PostHog from 'posthog-react-native';

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export const posthog = key
  ? new PostHog(key, {
      host: 'https://eu.i.posthog.com',
      personProfiles: 'never',
      captureAppLifecycleEvents: true,
    })
  : null;

type Event =
  | 'onboarding_finished'
  | 'face_scan_done'
  | 'tryon_done'
  | 'chat_sent'
  | 'ingredients_checked'
  | 'stylist_opened'
  | 'product_tapped'
  | 'book_tapped';

export function track(event: Event, props?: Record<string, string | number | boolean>) {
  try { posthog?.capture(event, props); } catch {}
}

export function analyticsOn(): boolean {
  return !!posthog && !posthog.optedOut;
}

export async function setAnalyticsOn(on: boolean) {
  if (!posthog) return;
  await (on ? posthog.optIn() : posthog.optOut());
}
