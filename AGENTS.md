# Halea: guide for AI agents

Read this first, every session. Before touching any screen, read `DESIGN.md` (exact tokens and rules), and `BRAND.md` for the full voice.

## What Halea is

A hair app for every texture, 1A to 4C, by Lumarae Labs Ltd (London). The loop the whole app serves:
**face scan → styles and colours to try → inspiration → a stylist who can do it.**
Think "Pinterest for hair" with a magazine feel, not a social network.

- Free at launch. No subscriptions, no paywall, no wallet. Money comes later from affiliate products and salon partnerships.
- Stylists are the core content. They join via a Google Form for now; there is no stylist side of the app yet.
- Target: live on the App Store by the end of October 2026.

## Who you're working with

Vyshnavi, the CTO, building Halea mostly alone.
- Act as the lead engineer: think through consequences, catch problems, flag risks before she hits them. Push back when something is a bad idea, with a reason.
- Plain language, short answers, no jargon dumps. She often uses voice-to-text, so read messages charitably.
- Do the work, then say what changed in a few lines. Don't ask questions you can answer by reading the code.
- She runs Windows (CMD). Supabase CLI runs as `npx supabase ...`, not a global install.

## Stack

- Expo SDK 57, React Native, Expo Router (`app/`), Reanimated, react-native-svg, expo-blur
- Supabase: database, auth, Edge Functions in `supabase/functions/`
  - `mistral-proxy`: the Halea chat (Mistral). Key stored as a Supabase secret.
  - `ai-tryon`: hair try-on via Replicate (Nano Banana Pro, 2K). Free with limits, see below.
  - `delete-account`: real account deletion (Apple requires it).
  - `create-checkout`, `create-discount`, `stripe-webhook`: Stripe leftovers. Not used in the app any more. Don't build on them.
- Face scan: on-device ML Kit (`@react-native-ml-kit/face-detection`) in `app/face-scan.tsx` + `lib/faceScan.ts`. The photo never leaves the phone.
- Builds: EAS (`eas.json`). The app needs a development build, not Expo Go (face scan, Rive and blur are native).

### Commands (Windows CMD)

```
npx expo start --dev-client -c                                  run against the dev build on the phone
npx -y eas-cli@latest build -p android --profile development    new Android dev build (cloud)
npx supabase functions deploy <name>                            deploy an Edge Function
npx supabase secrets list                                       check server keys
```

Type-check with `npx tsc --noEmit`. Known pre-existing error: `components/QuizSegmentStep.tsx` (`JSX` namespace). Ignore Deno errors from `supabase/functions` (they run on Deno, not Node).

## Hard rules

1. **No API keys in the app.** Never use `EXPO_PUBLIC_*` for secrets. Every AI or paid call goes through an authenticated Edge Function.
2. **One branch: `main`.** Old branches caused weeks of rework. Commit small and often with clear messages.
3. **No digital sales through Stripe.** Apple rejects it. Anything paid inside the app (credits, subscriptions) must use Apple/Google in-app purchase, and isn't planned before launch.
4. **AI is never the headline.** No "AI" labels, no sparkle icons used as "AI", no "AI companion". Say what it does: "Try a style", not "AI Hair Try-On".
5. **Every texture, equally.** Styles, products and copy must not default to straight or wavy hair. Braids, locs, puffs, twist-outs and coily hair are first-class.
6. **Don't guess skin tone from photos.** Users pick their undertone. Lighting makes photo guesses wrong, worst on dark skin.
7. **Test on the real Android phone** before calling something done. Her phone is slow; if it lags there, it needs fixing.
8. When you finish a change, give her the exact commands to run, one per line, nothing she has to edit.

## Design system

`DESIGN.md` has the exact values. The current decisions (October 2026) win where `BRAND.md` is older:

- **Fonts: Fraunces** for headings (the magazine voice, keep it), **Sora** for labels and buttons, **Inter** for body. Plus Jakarta Sans is used **only** for the wordmark (`components/HaleaWordmark.tsx`). Fraunces was tested against a sans and kept on purpose.
- **Colours:** dark base `#120B2E`, Deep Violet `#7643AC`, Soft Lavender `#C38CD9`, Blush Pink `#F484B9`, Porcelain `#FFFEF7` for text. **Electric Lime is retired** (replaced by lavender on 10 Oct). If `BRAND.md` still lists lime, update it.
- **Personality stays:** the halo, the slow orbs (`FluidOrb`, never faster than one turn per 18s), stars, the light on the chat screen. They are Halea's character. Balance them, don't strip them. Full magic on moments (splash, intro, chat welcome, results); calmer on everyday screens.
- **Glass** (`expo-blur`) must really blur on Android: `blurMethod="dimezisBlurViewSdk31Plus"` plus a `BlurTargetView` around the content (see `app/(tabs)/_layout.tsx`).
- **Nav:** normal-case labels, a soft lavender pill behind the active tab, no dots.
- **References:** Luma (cohesion, polish, the opening reveal), Stardust (atmosphere), Shea (routine tracking). Aim for Apple-level consistency: same spacing, radius and type scale everywhere.
- **Copy:** no em dashes, no emojis, no exclamation marks, no "queen/sis/girl", no "It's not X, it's Y". Quiz personas are mythic characters (Frost Fae, Storm Oracle, Honey Mermaid), never TikTok-voice.
- **Brand line:** "Step into your halo." Icon: lowercase h inside the halo ring.

## Free try-on limits (`supabase/functions/ai-tryon`)

3 per phone per day, 3 per account per day, 300 per day for the whole app (about $40 worst case), 2K resolution. The phone is identified by `lib/deviceId.ts` so extra email accounts don't reset the count. Change the numbers at the top of the function and redeploy; no app update needed.

## Where things stand (11 Oct 2026)

Done: face scan + merged onboarding (name → scan → quiz), subscription and wallet removed, free try-on with limits, real account deletion, terms/privacy links pointing at lumaraelabs.com, Android dev build working, design polish (wordmark reveal, glass nav, lavender, slower orbs), new icon.

### Launch to-do (in order)

- [ ] **Chat:** it errors in testing. In dev builds the screen now shows the real error (`Chat error <status>: ...`). Find the cause (Mistral key, deploy, Supabase project paused, or free-tier limits) and fix it.
- [ ] **Check the glass nav** actually blurs on her Android phone.
- [ ] **Screen-by-screen polish** from her screenshots: intro, Home, chat, try-on first; then Discover, Shop, Profile, Settings. Make every screen follow the same spacing, radius and type scale.
- [ ] **Sentry** crash reporting (`@sentry/react-native`), before TestFlight.
- [ ] **EAS Update** for over-the-air fixes (`expo-updates`), before launch.
- [ ] **Clean up repo junk** (ask first): `tressie-all.zip`, `tressie-update.zip`, `fix-polish.js`, `rename-and-theme.js`, `day2-feed-and-rive.patch`.
- [ ] **iPhone build + TestFlight** once the Apple Developer account exists (her business partner is setting it up). Then 15 to 20 testers for a few days.
- [ ] **App Store listing:** title with keywords, subtitle, description that hooks in two lines, benefit screenshots (scan result, persona card, a stylist), category, age rating, privacy questionnaire.
- [ ] **Submit to Apple around 23 Oct**, leaving room for one rejection.

### After launch (not before)

Weekly curated Discover (magazine style), progress photos over time ("Month 1 vs Month 3"), goal tracking from the quiz, the TikTok/Snapchat face-shape filter, paid try-on credits via Apple in-app purchase, events.

## Business partner owns (not code)

Apple Developer account and D-U-N-S, Google Play account, running-cost budget (Replicate, Mistral, Supabase), privacy and terms pages live on lumaraelabs.com (solicitor review first), ICO registration check, social handles (@halea.app), stylist outreach (25 to 30 in South London before launch), tester list.
