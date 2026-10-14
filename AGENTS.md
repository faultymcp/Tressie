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
  - `mistral-proxy`: the Halea chat (Mistral). Builds the assistant's instructions and product list on the server; 40 messages per user per day. Key stored as a Supabase secret.
  - `ai-tryon`: hair try-on via Replicate (Nano Banana Pro, 2K). Free with limits, see below.
  - `delete-account`: real account deletion (Apple requires it).
  - `ingredient-lookup`: explains a product's ingredients from a barcode or a pasted list. Facts only from Open Beauty Facts, EU CosIng and Halea's own notes (`ingredients` table), no AI. Used by "Scan a barcode" and "Check ingredients" in the chat. See `docs/INGREDIENTS.md`.
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
9. **No pretend features.** If a button says it reads a photo or looks something up, it must really do that. Never send the chat model a request about data it can't see.
10. **The GitHub repo must stay private.** Old commits contain API keys.

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

## Where things stand (13 Oct 2026)

Done: face scan + merged onboarding (name → scan → quiz), subscription and wallet removed from Profile, free try-on with limits, real account deletion, terms/privacy links pointing at lumaraelabs.com, Android dev build working, design polish (wordmark reveal, glass nav, lavender, slower orbs), new icon, agent guides. Sign-in emails go through Brevo SMTP (free tier, about 300 emails a day).

Decided 12 Oct: XP, rewards, referrals and bookings are cut from v1 (nothing real behind them yet). The app is dark-only, so there is no dark mode setting. The day streak stays (it's real).

Done 12 Oct: database security (RLS on every user table, salon and booking inserts closed; SQL in `supabase/sql/2026-10-12_chat_limits_and_security.sql`), chat moved server-side with a 40-messages-a-day cap (`chat_usage` table), reviewer password login for `appreview@lumaraelabs.com` only (account created by hand in Supabase; password lives in App Store Connect, never in git), iPhone save-photo permission, XP/referral/bookings/dark-mode/wallet/subscription/business screens and Stripe code removed, unused packages removed. Needs a new dev build because `app.json` plugins changed.

Done 13 Oct: the chat's barcode scanner now uses `ingredient-lookup` (Open Beauty Facts) instead of the food database. The fake "photo of ingredient label" option (it never sent the photo) is replaced by "Check ingredients" (paste the list). Try-on copy no longer says "AI" or "4K". Ingredient tables and 155 notes: `supabase/sql/2026-10-13_ingredients.sql`; the CosIng list is imported by hand from `cosing-clean.csv` (not in git).

### Launch to-do (in order, one item per session)

**Day 1: can real people sign in safely**
- [x] **Security check.** Every Supabase table holding user data (`user_hair_profiles`, `profiles`, `favourites`, `user_routines`, `user_routine_steps`, `routine_completions`, `tryon_history`, `tressie_messages`, and any other) must have Row Level Security on, with policies so a user can only read and write their own rows. Check Supabase → Advisors → Security, fix what it flags, and save the policies as a SQL file in `supabase/sql/` so they live in git.
- [x] **Sign-in works for strangers.** Confirm a sign-in code arrives at an email address that is NOT on the Supabase team (Brevo is set as custom SMTP).
- [x] **Apple reviewer login.** Apple's reviewer can't receive our email codes. Add one reviewer account that can sign in without a code (for example a password login that only works for one reviewer email). Note the credentials for App Store Connect, not in git.

**Day 1 to 2: close the money and crash holes**
- [x] **Chat on the server.** `mistral-proxy` currently accepts any system prompt from the app, with no limit, so anyone signed in could use our Mistral account for anything. Move the system prompt into the function (the app sends only the user's messages and hair type), and add a daily cap per user (for example 40 messages) using a small table, like `ai-tryon` does. Friendly message when the cap is hit.
- [ ] **Fix the chat error** if it still fails after this (dev builds show `Chat error <status>: ...`).
- [ ] **Repo private and old keys revoked.** The repo was public and early commits contain Replicate, Gemini, Groq, Hugging Face and Together keys. Make it private and revoke those keys; give `ai-tryon` a fresh Replicate token.
- [x] **Saving photos on iPhone.** Add the `expo-media-library` plugin to `app.json` with a "save photos" permission sentence, or saving a try-on crashes on iOS.

**Day 2: cut what isn't real**
- [x] Remove XP everywhere: the XP & Rewards screen, XP toasts on Home, the XP stat on Profile, `award_xp` calls.
- [x] Remove Refer a Friend (promises £5 off and links to halea.app, which we don't own) and My Bookings (no booking flow yet).
- [x] Remove the Dark mode toggle in Settings.
- [x] Delete dead screens and code: `app/wallet.tsx`, `app/subscription.tsx`, `app/account-type.tsx`, `components/ProGate.tsx`, `lib/payments.ts` if unused, and their `Stack.Screen` entries.
- [x] Remove unused packages: `replicate`, `@gradio/client`, `expo-crypto`, `expo-auth-session` (check nothing imports them first).
- [x] Undeploy the Stripe functions (`create-checkout`, `create-discount`, `stripe-webhook`) and delete their folders.
- [x] Remove repo junk: `tressie-all.zip`, `tressie-update.zip`, `fix-polish.js`, `rename-and-theme.js`, `day2-feed-and-rive.patch`.

**Day 3: see what happens after launch**
- [x] **Sentry** crash reporting (`lib/sentry.ts`, root layout wrapped). Turned on by `EXPO_PUBLIC_SENTRY_DSN` in `.env`. Source map upload is off (`SENTRY_DISABLE_AUTO_UPLOAD` in `eas.json`); add organization/project to the plugin in `app.json` and a `SENTRY_AUTH_TOKEN` EAS secret later for readable stack traces.
- [x] **Analytics:** PostHog EU (`lib/analytics.ts`), turned on by `EXPO_PUBLIC_POSTHOG_KEY`. Seven events via `track()`: onboarding_finished, face_scan_done, tryon_done, chat_sent, ingredients_checked, stylist_opened, product_tapped. Anonymous (no identify, no person profiles). Users can switch it off in Settings.
- [ ] **EAS Update** (`expo-updates`) so fixes reach phones without a new App Store review.
- [ ] Add Sentry and PostHog to the privacy policy's list of services.

**Days 4 to 8: make it feel designed**
- [ ] **Consistency pass.** The app uses 27 text sizes and 26 corner radii. Snap every screen to `DESIGN.md`: type scale only, spacing scale only, radii 8/12/16/20/pill only. Replace leftover lime (`#8AB800`, `#c8e878`) and stray greens/reds with palette colours.
- [ ] **Profile rebuild.** With XP, wallet, bookings and referral gone, make Profile about the user: persona card, face scan result (with "scan again"), hair profile, saved looks and favourites, then settings, privacy and sign out.
- [ ] **Home cleanup.** Keep the week strip and routine ring; no XP pop-ups.
- [ ] **Chat screen.** Choose either the light rays or the glowing core, not both.
- [ ] **Screen-by-screen polish** from Vyshnavi's phone screenshots.
- [ ] **Settings has pretend rows** (rule 9): Export my data promises an email that never comes, Change password and Edit profile do nothing, Booking updates and Promotions notifications have nothing behind them. Make them real or remove them.
- [ ] **Production builds need the `EXPO_PUBLIC_*` values as EAS environment variables** (`.env` is not uploaded to EAS). Dev builds read `.env` through Metro.

**Before submission: real stylists without an app update**
- [x] Stylists live in the Supabase `stylists` table (`supabase/sql/2026-10-14_stylists.sql`, read via `lib/stylists.ts`). Add a stylist in Table Editor; photos go in the public `stylist-photos` Storage bucket; `booking_url` powers the Book button. Hide the 4 samples (`published = false`) once real stylists are in.
- [ ] Decide the final bundle ID before the first store build (`com.halea.app` may already be taken on Apple; `com.lumaraelabs.halea` is ours for sure). It can't change after release.

**When the Apple account exists**
- [ ] iPhone build, TestFlight with 15 to 20 testers for a few days.
- [ ] App Store listing: keyword title, subtitle, description that hooks in two lines, benefit screenshots (scan result, persona card, a stylist), category, age rating, privacy questionnaire, reviewer login.
- [ ] Submit. Aim for late October; expect one rejection round.

**Content blocker (business partner):** Discover is all sample stylists. Apple can reject an app whose main content is placeholders, so real stylists (target 20 to 25) must be in before submission.

### After launch (not before)

Weekly curated Discover (magazine style), progress photos over time ("Month 1 vs Month 3"), goal tracking from the quiz, the TikTok/Snapchat face-shape filter, paid try-on credits via Apple in-app purchase, events.

## Business partner owns (not code)

Apple Developer account and D-U-N-S, Google Play account, running-cost budget (Replicate, Mistral, Supabase), privacy and terms pages live on lumaraelabs.com (solicitor review first), ICO registration check, social handles (@halea.app), stylist outreach (25 to 30 in South London before launch), tester list.
