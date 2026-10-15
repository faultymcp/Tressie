// app/pro/[id].tsx
// A stylist's page, laid out like Uber Eats or a shop product page:
// - Their photos fill the top. As you scroll, the photos drift up slower than
//   the page (parallax) and a rounded sheet slides up over them with the details.
//   Pull down at the top and the photos stretch.
// - Once the photos have scrolled away, a glass bar fades in with their name.
// - The sheet: name, "Halea verified", rating (with where it's from), area,
//   price list, about, hair types, their work, reviews.
// - Book stays pinned at the bottom and opens their own booking page.
// Sample profiles are tagged as samples.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import Pressable from '@/components/primitives/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Fonts } from '@/constants/theme';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { RatingLine, Stars } from '@/components/Rating';
import {
  fetchStylist, fetchStylistServices, fetchStylistReviews,
  type Stylist, type StylistService, type StylistReview,
} from '@/lib/stylists';
import { formatLength, formatPrice } from '@/lib/format';
import { track } from '@/lib/analytics';

const { width: W } = Dimensions.get('window');
const PHOTO_H = Math.round(W * 1.15);
const SHEET_OVERLAP = 28;
const TOP = Platform.OS === 'ios' ? 54 : 40;
const GRID_GAP = 8;
const TILE = Math.floor((W - 40 - GRID_GAP) / 2);

function reviewDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function StylistProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<Stylist | null | undefined>(undefined); // undefined = loading
  const [services, setServices] = useState<StylistService[]>([]);
  const [reviews, setReviews] = useState<StylistReview[]>([]);

  useEffect(() => {
    const sid = String(id);
    fetchStylist(sid).then(setS).catch(() => setS(null));
    fetchStylistServices(sid).then(setServices).catch(() => {});
    fetchStylistReviews(sid).then(setReviews).catch(() => {});
  }, [id]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  // Photos move up at half speed, and stretch when pulled down
  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: scrollY.value > 0 ? scrollY.value * 0.5 : scrollY.value / 2 },
      { scale: interpolate(scrollY.value, [-200, 0], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));
  // Glass name bar fades in once the photos are mostly gone
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [PHOTO_H - 160, PHOTO_H - 80], [0, 1], Extrapolation.CLAMP),
  }));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/discover'));

  if (s === undefined) return <View style={st.container} />;

  if (!s) {
    return (
      <View style={[st.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={st.about}>This profile isn't available.</Text>
        <Pressable onPress={back} style={{ marginTop: 16 }}><Text style={st.link}>Back to Discover</Text></Pressable>
      </View>
    );
  }

  const first = s.name.split(' ')[0];
  const lowest = services.length ? Math.min(...services.map(x => x.pricePence)) : null;
  const canBook = !s.sample && !!s.bookingUrl;

  return (
    <View style={st.container}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Photos, behind the sheet */}
        <Animated.View style={[{ height: PHOTO_H }, photoStyle]}>
          <PhotoCarousel photos={s.photos} width={W} height={PHOTO_H} radius={0} dotsBottom={SHEET_OVERLAP + 16} />
        </Animated.View>

        {/* The sheet that slides up over the photos */}
        <View style={st.sheet}>
          <View style={st.grabber} />

          <Animated.View entering={FadeInUp.duration(320)}>
            <View style={st.nameRow}>
              <Text style={st.name}>{s.name}</Text>
            </View>
            {s.verified ? <View style={{ marginTop: 8 }}><VerifiedBadge /></View> : null}
            <Text style={st.speciality}>{s.speciality}</Text>

            <View style={st.facts}>
              {s.rating != null ? <RatingLine rating={s.rating} count={s.ratingCount} source={s.ratingSource} /> : null}
              <Text style={st.factText}>{s.city}</Text>
              {lowest != null ? <Text style={st.factPrice}>{formatPrice(lowest, true)}</Text> : null}
            </View>
          </Animated.View>

          {/* Prices */}
          {services.length > 0 ? (
            <>
              <Text style={st.section}>Services and prices</Text>
              <View style={st.card}>
                {services.map((sv, i) => (
                  <View key={sv.id} style={[st.menuRow, i > 0 && st.divider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.menuName}>{sv.name}</Text>
                      <Text style={st.menuMeta}>{formatLength(sv.durationMin)}</Text>
                    </View>
                    <Text style={st.menuPrice}>{formatPrice(sv.pricePence, sv.priceFrom)}</Text>
                  </View>
                ))}
              </View>
              <Text style={st.note}>Prices are set by {first}. You pay {first} directly.</Text>
            </>
          ) : s.services.length > 0 ? (
            <>
              <Text style={st.section}>Services</Text>
              <View style={st.chips}>
                {s.services.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
              </View>
            </>
          ) : null}

          {/* About */}
          {s.about ? (
            <>
              <Text style={st.section}>About {first}</Text>
              <Text style={st.about}>{s.about}</Text>
            </>
          ) : null}

          {s.hairTypes.length > 0 ? (
            <>
              <Text style={st.section}>Hair types</Text>
              <View style={st.chips}>
                {s.hairTypes.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
              </View>
            </>
          ) : null}

          {/* Work */}
          {s.photos.length > 0 ? (
            <>
              <Text style={st.section}>Their work</Text>
              <View style={st.grid}>
                {s.photos.map((uri, i) => <Image key={i} source={{ uri }} style={st.tile} resizeMode="cover" />)}
              </View>
            </>
          ) : null}

          {/* Reviews */}
          {reviews.length > 0 ? (
            <>
              <View style={st.reviewsHead}>
                <Text style={[st.section, { marginTop: 0 }]}>Reviews</Text>
                {s.rating != null ? <RatingLine rating={s.rating} count={s.ratingCount} source={s.ratingSource} /> : null}
              </View>
              {reviews.map(r => (
                <View key={r.id} style={st.review}>
                  <View style={st.reviewTop}>
                    <Stars value={r.rating} />
                    <Text style={st.reviewDate}>{[reviewDate(r.date), r.source].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={st.reviewBody}>{r.body}</Text>
                  <Text style={st.reviewAuthor}>{r.author}</Text>
                </View>
              ))}
            </>
          ) : null}

          {s.sample ? <Text style={st.credit}>Sample profile: photos via Unsplash, reviews and prices for illustration.</Text> : null}
        </View>
      </Animated.ScrollView>

      {/* Glass bar with their name, appears once the photos scroll away */}
      <Animated.View style={[st.bar, barStyle]} pointerEvents="none">
        <Text style={st.barName} numberOfLines={1}>{s.name}</Text>
        {s.verified ? <VerifiedBadge compact /> : null}
      </Animated.View>

      {/* Back, always on top */}
      <Pressable onPress={back} style={st.back} hitSlop={10} accessibilityLabel="Back">
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      </Pressable>
      {s.sample ? (
        <View style={st.sampleTag} pointerEvents="none">
          <Text style={st.sampleText}>Sample profile</Text>
        </View>
      ) : null}

      {/* Book, pinned. The fade keeps text from showing through behind it. */}
      <LinearGradient
        colors={['rgba(18,11,46,0)', 'rgba(18,11,46,0.92)', '#120B2E']}
        locations={[0, 0.35, 1]}
        style={st.footer}
        pointerEvents="box-none"
      >
        <Pressable
          disabled={!canBook}
          haptic="tap"
          onPress={() => {
            if (!s.bookingUrl) return;
            track('book_tapped', { stylist: s.id });
            WebBrowser.openBrowserAsync(s.bookingUrl).catch(() => {});
          }}
          style={[st.btn, !canBook && st.btnOff]}
        >
          <Text style={st.btnText}>
            {s.sample ? 'Bookings open when stylists join' : s.bookingUrl ? `Book with ${first}` : 'Booking details coming soon'}
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const glass = {
  backgroundColor: 'rgba(255,255,255,0.07)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: Colors.porcelain,
    paddingHorizontal: 20, paddingTop: 12,
    minHeight: 600,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 20 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: Fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: Colors.ink },
  speciality: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 22, color: 'rgba(255,254,247,0.8)', marginTop: 8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16, rowGap: 8, marginTop: 12 },
  factText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  factPrice: { fontFamily: 'Sora_500Medium', fontSize: 14, color: Colors.lavender },

  section: { fontFamily: Fonts.headingSemi, fontSize: 22, lineHeight: 28, color: Colors.ink, marginTop: 32, marginBottom: 12 },
  about: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 24, color: 'rgba(255,254,247,0.8)' },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.lavender },
  note: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 8 },

  card: { borderRadius: 16, paddingHorizontal: 16, ...glass },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
  menuName: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  menuMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 4 },
  menuPrice: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.ink },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, ...glass },
  chipText: { fontFamily: 'Sora_500Medium', fontSize: 12, color: Colors.ink },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: TILE, height: Math.round(TILE * 1.25), borderRadius: 16 },

  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 12 },
  review: { padding: 16, borderRadius: 16, marginBottom: 8, ...glass },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  reviewBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, color: Colors.ink, marginTop: 8 },
  reviewAuthor: { fontFamily: 'Sora_500Medium', fontSize: 12, color: Colors.muted, marginTop: 8 },

  credit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 24, opacity: 0.7 },

  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: TOP + 52,
    paddingTop: TOP, paddingLeft: 72, paddingRight: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(18,11,46,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  barName: { fontFamily: Fonts.headingSemi, fontSize: 16, color: Colors.ink, flexShrink: 1 },
  back: {
    position: 'absolute', top: TOP + 4, left: 20, width: 40, height: 40, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(18,11,46,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleTag: {
    position: 'absolute', top: TOP + 12, right: 20, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(18,11,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleText: { fontFamily: 'Sora_500Medium', fontSize: 11, color: 'rgba(255,254,247,0.85)' },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 32 },
  btn: {
    height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnOff: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0 },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 16, color: '#FFFFFF' },
});
