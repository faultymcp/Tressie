// constants/feedData.ts
// Curated for the "Style inspiration" section of discover.tsx.
// Every image below was fetched and confirmed "Free to use under the Unsplash
// License" (not Unsplash+, which is paid) before being included here.
// Photographer credit kept in `byline` — not required by the license, but good
// practice and an easy source of truth if a photo ever needs swapping out.
//
// Two candidates you sent were deliberately left out:
//   - FKknWBrPzb0 ("topless woman...") — free-licensed but not appropriate content
//   - S2q43InQd7s (tagged "bikini model") — off-brand styling, your call if you
//     want it back in
//
// Aspect ratios below are reasonable estimates for masonry variety, not exact
// measurements — adjust once you see them rendered.

import type { FeedItem } from '@/components/MasonryFeed';

export const feedData: FeedItem[] = [
  {
    id: 'unsplash-z9r0fPD-z0U',
    imageUrl: 'https://images.unsplash.com/photo-1739825353871-2b9c6716142a?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Curl definition',
    byline: 'Ivan Aviles / Unsplash',
    aspectRatio: 1.25,
  },
  {
    id: 'unsplash-aTmX-lT-4HM',
    imageUrl: 'https://images.unsplash.com/photo-1674484145277-b42f70fbbfec?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Sleek and straight',
    byline: 'Teslariu Mihai / Unsplash',
    aspectRatio: 1.4,
  },
  {
    id: 'unsplash-xmSWVeGEnJw',
    imageUrl: 'https://images.unsplash.com/photo-1632765854612-9b02b6ec2b15?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Natural afro',
    byline: 'Raissa for Good Faces / Unsplash',
    aspectRatio: 1.15,
  },
  {
    id: 'unsplash-T1ZpP_ASYzc',
    imageUrl: 'https://images.unsplash.com/photo-1783445744072-b2bc87d633ec?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Bold and full',
    byline: 'Cleopas Monbest / Unsplash',
    aspectRatio: 1.3,
  },
  {
    id: 'unsplash-E1QbnThiatM',
    imageUrl: 'https://images.unsplash.com/photo-1664293272875-2cfa64e687c7?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Curl inspiration',
    byline: 'Good Faces Agency / Unsplash',
    aspectRatio: 1.2,
  },
  {
    id: 'unsplash-RjnRMhfR5Dc',
    imageUrl: 'https://images.unsplash.com/photo-1583994009906-c00c0bd8acb2?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Wash-day glow',
    byline: 'Rikonavt / Unsplash',
    aspectRatio: 1.1,
  },
  {
    id: 'unsplash-w_zA_e8TRfM',
    imageUrl: 'https://images.unsplash.com/photo-1673470907547-1c0c6a996095?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Cornrows',
    byline: 'Ben Iwara / Unsplash',
    aspectRatio: 1.35,
  },
  {
    id: 'unsplash-zWOPIzzzltk',
    imageUrl: 'https://images.unsplash.com/photo-1612459284970-e8f027596582?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Braided protective style',
    byline: 'Brock Wegner / Unsplash',
    aspectRatio: 1.25,
  },
  {
    id: 'unsplash-NB-DvbAQRok',
    imageUrl: 'https://images.unsplash.com/photo-1778953501987-ece284f0b34a?fm=jpg&q=80&w=1200&auto=format&fit=crop',
    title: 'Street style braids',
    byline: 'Michael Kyule / Unsplash',
    aspectRatio: 1.3,
  },
];
