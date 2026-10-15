// app/pro/[id].tsx
// A stylist's own page: their photos, what they do, and more of their work.
// Sample profiles say so, and the booking button is honest about it:
// real stylists' button opens their own booking page or Instagram.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import Pressable from '@/components/primitives/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { FluidOrb } from '@/components/FluidOrb';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import * as WebBrowser from 'expo-web-browser';
import { fetchStylist, fetchStylistServices, Stylist, type StylistService } from '@/lib/stylists';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { formatLength, formatPrice } from '@/lib/format';
import { track } from '@/lib/analytics';

const { width: W } = Dimensions.get('window');
const GRID_GAP = 8;
const TILE = Math.floor((W - 40 - GRID_GAP) / 2);

export default function StylistProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [s, setS] = useState<Stylist | null | undefined>(undefined); // undefined = loading
  const [priced, setPriced] = useState<StylistService[]>([]);

  useEffect(() => {
    fetchStylist(String(id)).then(setS).catch(() => setS(null));
    fetchStylistServices(String(id)).then(setPriced).catch(() => {});
  }, [id]);

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

  return (
    <View style={st.container}>
      <FluidOrb color={Colors.violet} size={380} top={-40} left={160} spinDuration={16000} spinDirection={1} breatheDuration={4000} baseOpacity={0.22} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <View>
          <PhotoCarousel photos={s.photos} width={W} height={Math.round(W * 1.15)} radius={0} />
          <Pressable onPress={back} style={st.back} hitSlop={10}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </Pressable>
          {s.sample ? (
            <View style={st.sampleTag} pointerEvents="none">
              <Text style={st.sampleText}>SAMPLE PROFILE</Text>
            </View>
          ) : null}
        </View>

        <Animated.View entering={FadeInUp.duration(400)} style={st.body}>
          <Text style={st.name}>{s.name}</Text>
          {s.verified ? <View style={{ marginTop: 8 }}><VerifiedBadge /></View> : null}
          <Text style={st.speciality}>{s.speciality}</Text>
          <Text style={st.city}>{s.city}</Text>

          <Text style={st.about}>{s.about}</Text>

          <Text style={st.label}>HAIR TYPES</Text>
          <View style={st.chips}>
            {s.hairTypes.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
          </View>

          <Text style={st.label}>SERVICES</Text>
          {priced.length > 0 ? (
            <View style={st.menu}>
              {priced.map((sv, i) => (
                <View key={sv.id} style={[st.menuRow, i > 0 && st.menuDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.menuName}>{sv.name}</Text>
                    <Text style={st.menuMeta}>{formatLength(sv.durationMin)}</Text>
                  </View>
                  <Text style={st.menuPrice}>{formatPrice(sv.pricePence, sv.priceFrom)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={st.chips}>
              {s.services.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
            </View>
          )}

          <Text style={st.label}>WORK</Text>
          <View style={st.grid}>
            {s.photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={st.tile} resizeMode="cover" />
            ))}
          </View>
          {s.sample ? <Text style={st.credit}>Photos via Unsplash, shown as a sample.</Text> : null}
        </Animated.View>
      </ScrollView>

      <View style={st.footer}>
        {/* Book opens the stylist's own booking page (Fresha, Booksy, website or
            Instagram). Samples can't be booked. Every tap is counted as a lead. */}
        <Pressable
          disabled={s.sample || !s.bookingUrl}
          haptic="tap"
          onPress={() => {
            if (!s.bookingUrl) return;
            track('book_tapped', { stylist: s.id });
            WebBrowser.openBrowserAsync(s.bookingUrl).catch(() => {});
          }}
          style={[st.btn, (s.sample || !s.bookingUrl) && st.btnOff]}
        >
          <Text style={st.btnText}>
            {s.sample ? 'Bookings open when stylists join' : s.bookingUrl ? `Book with ${s.name.split(' ')[0]}` : 'Booking details coming soon'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  content: { paddingBottom: 140 },
  back: {
    position: 'absolute', top: 56, left: 20, width: 38, height: 38, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(18,11,46,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleTag: {
    position: 'absolute', top: 60, right: 20, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(18,11,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleText: { fontFamily: Fonts.bodySemi, fontSize: 11, letterSpacing: 1.4, color: 'rgba(255,254,247,0.85)' },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  name: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.ink, letterSpacing: -0.5 },
  speciality: { fontFamily: Fonts.body, fontSize: 16, color: 'rgba(255,254,247,0.8)', marginTop: 4 },
  city: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, marginTop: 2 },
  about: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23, color: 'rgba(255,254,247,0.8)', marginTop: 20 },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 11, letterSpacing: 1.6, color: Colors.muted, marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: TILE, height: Math.round(TILE * 1.25), borderRadius: 16 },
  credit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 12, opacity: 0.7 },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.lavender },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 36 },
  btn: {
    height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnOff: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0 },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 16, color: '#FFFFFF' },
  menu: {
    borderRadius: 16, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
  menuName: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  menuMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 4 },
  menuPrice: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.ink },
});
