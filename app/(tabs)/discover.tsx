// app/(tabs)/discover.tsx
// Discover = stylists' work. Each card is a swipeable set of a stylist's
// photos; tap to open their full profile. Products moved to their own tab.
// Stylists come from Supabase (lib/stylists.ts), so new ones appear without an
// app update. Sample profiles are marked as samples on every card.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Pressable from '@/components/primitives/Pressable';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { FluidOrb } from '@/components/FluidOrb';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { fetchStylists, fetchFromPrices, Stylist } from '@/lib/stylists';
import { RatingLine } from '@/components/Rating';
import { formatPrice } from '@/lib/format';
import { track } from '@/lib/analytics';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 40;
const PHOTO_H = Math.round(CARD_W * 1.1);

export default function DiscoverScreen() {
  const router = useRouter();
  const [typeGroup, setTypeGroup] = useState('');
  const [stylists, setStylists] = useState<Stylist[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [prices, setPrices] = useState<Record<string, { pence: number; from: boolean }>>({});

  // Reload whenever the tab is opened, so newly added stylists show up.
  useFocusEffect(useCallback(() => {
    fetchStylists()
      .then(list => { setStylists(list); setFailed(false); })
      .catch(() => setFailed(true));
    fetchFromPrices().then(setPrices).catch(() => {});
  }, []));

  useEffect(() => {
    AsyncStorage.getItem('halea_quiz').then(raw => {
      const t = raw ? (JSON.parse(raw)?.hairType as string) : '';
      if (t) setTypeGroup(t.charAt(0));
    }).catch(() => {});
  }, []);

  // Stylists who work with this person's hair type come first.
  const ordered = [...(stylists ?? [])].sort((a, b) => {
    const ma = typeGroup && a.hairTypes.includes(`Type ${typeGroup}`) ? 0 : 1;
    const mb = typeGroup && b.hairTypes.includes(`Type ${typeGroup}`) ? 0 : 1;
    return ma - mb;
  });

  const open = (s: Stylist) => {
    Haptics.selectionAsync().catch(() => {});
    track('stylist_opened', { sample: s.sample });
    router.push(`/pro/${s.id}`);
  };

  return (
    <View style={st.container}>
      <FluidOrb color={Colors.violet} size={380} top={-60} left={180} spinDuration={16000} spinDirection={1} breatheDuration={4000} baseOpacity={0.22} />
      <FluidOrb color={Colors.pink} size={300} top={520} left={-90} spinDuration={20000} spinDirection={-1} breatheDuration={4600} baseOpacity={0.14} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <View style={st.header}>
          <Text style={st.title}>Discover</Text>
          <Text style={st.subtitle}>
            {typeGroup ? `Stylists who know Type ${typeGroup} hair` : 'Stylists and their work'}
          </Text>
        </View>

        {ordered.map((s, i) => (
          <Animated.View key={s.id} entering={FadeInUp.duration(320).delay(Math.min(i, 5) * 60)} style={st.card}>
            <View>
              <PhotoCarousel photos={s.photos} width={CARD_W} height={PHOTO_H} radius={0} />
              {s.sample ? (
                <View style={st.sampleTag} pointerEvents="none">
                  <Text style={st.sampleText}>SAMPLE PROFILE</Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => open(s)} style={({ pressed }) => [st.info, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <View style={st.nameRow}>
                  <Text style={st.name}>{s.name}</Text>
                  {s.verified ? <VerifiedBadge compact /> : null}
                </View>
                <Text style={st.speciality}>{s.speciality}</Text>
                <Text style={st.city}>{s.city}</Text>
                {(s.rating != null || prices[s.id]) ? (
                  <View style={st.metaRow}>
                    {s.rating != null ? <RatingLine rating={s.rating} count={s.ratingCount} /> : null}
                    {prices[s.id] ? <Text style={st.price}>{formatPrice(prices[s.id].pence, true)}</Text> : null}
                  </View>
                ) : null}
              </View>
              <Text style={st.viewLink}>View work →</Text>
            </Pressable>
          </Animated.View>
        ))}

        {failed && !stylists ? (
          <Text style={st.footnote}>We couldn't load stylists. Check your connection and open this tab again.</Text>
        ) : null}

        {ordered.some(s => s.sample) ? (
          <Text style={st.footnote}>
            Sample profiles shown while stylist applications open. Photos via Unsplash.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  content: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 130 },
  header: { marginBottom: 20 },
  title: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, marginTop: 4 },
  card: {
    marginBottom: 24, borderRadius: 20, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  sampleTag: {
    position: 'absolute', top: 14, left: 14, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(18,11,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleText: { fontFamily: Fonts.bodySemi, fontSize: 11, letterSpacing: 1.4, color: 'rgba(255,254,247,0.85)' },
  info: { flexDirection: 'row', alignItems: 'flex-end', padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  price: { fontFamily: 'Sora_500Medium', fontSize: 12, color: Colors.lavender },
  name: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink },
  speciality: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,254,247,0.75)', marginTop: 3 },
  city: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  viewLink: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.lavender },
  footnote: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 4, opacity: 0.7 },
});
