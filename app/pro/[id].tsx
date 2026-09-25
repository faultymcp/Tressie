// app/pro/[id].tsx
// A stylist's own page: their photos, what they do, and more of their work.
// Sample profiles say so, and the booking button is honest about it:
// bookings open once a stylist actually joins.

import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { FluidOrb } from '@/components/FluidOrb';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { getStylist } from '@/constants/stylists';

const { width: W } = Dimensions.get('window');
const GRID_GAP = 8;
const TILE = Math.floor((W - 40 - GRID_GAP) / 2);

export default function StylistProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const s = getStylist(String(id));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/discover'));

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
          <Text style={st.speciality}>{s.speciality}</Text>
          <Text style={st.city}>{s.city}</Text>

          <Text style={st.about}>{s.about}</Text>

          <Text style={st.label}>HAIR TYPES</Text>
          <View style={st.chips}>
            {s.hairTypes.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
          </View>

          <Text style={st.label}>SERVICES</Text>
          <View style={st.chips}>
            {s.services.map(t => <View key={t} style={st.chip}><Text style={st.chipText}>{t}</Text></View>)}
          </View>

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
        <Pressable
          disabled={s.sample}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})}
          style={[st.btn, s.sample && st.btnOff]}
        >
          <Text style={st.btnText}>{s.sample ? 'Bookings open when stylists join' : 'Request a booking'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  content: { paddingBottom: 140 },
  back: {
    position: 'absolute', top: 56, left: 20, width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(18,11,46,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleTag: {
    position: 'absolute', top: 60, right: 20, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999,
    backgroundColor: 'rgba(18,11,46,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sampleText: { fontFamily: Fonts.bodySemi, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,254,247,0.85)' },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  name: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.ink, letterSpacing: -0.5 },
  speciality: { fontFamily: Fonts.body, fontSize: 15, color: 'rgba(255,254,247,0.8)', marginTop: 4 },
  city: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  about: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: 'rgba(255,254,247,0.8)', marginTop: 18 },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 10, letterSpacing: 1.6, color: Colors.muted, marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { width: TILE, height: Math.round(TILE * 1.25), borderRadius: 16 },
  credit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 10, opacity: 0.7 },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.lavender },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 36 },
  btn: {
    height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnOff: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0 },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 15, color: '#FFFFFF' },
});
