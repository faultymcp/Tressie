// app/stylist.tsx
// "Show us your work" — where stylists land from onboarding. For now this
// opens the Google Form in an in-app browser; later it becomes the stylist
// sign-up and upload flow. Same world as the rest of onboarding: halo above,
// one headline, one glowing action.

import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';
import { STYLIST_FORM_URL } from '@/constants/links';

const STEPS = [
  'Tell us about you and your speciality',
  'Share a few photos of your work',
  "We review it and feature you on Halea",
];

export default function StylistScreen() {
  const router = useRouter();

  const openForm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await WebBrowser.openBrowserAsync(STYLIST_FORM_URL, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: '#7643AC',
    }).catch(() => {});
  };

  return (
    <View style={s.root}>
      <HaloBackground />
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" />
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={10}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </Pressable>

        <View style={s.body}>
          <Animated.Text entering={FadeInUp.duration(480)} style={s.h}>
            Show us your <Text style={s.hEm}>work.</Text>
          </Animated.Text>
          <Animated.Text entering={FadeInUp.duration(480).delay(80)} style={s.p}>
            Halea helps people find stylists who understand their hair. We'd love to feature you.
          </Animated.Text>

          <Animated.View entering={FadeInUp.duration(480).delay(160)} style={s.card}>
            {STEPS.map((t, i) => (
              <View key={t} style={[s.row, i > 0 && s.rowDivider]}>
                <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
                <Text style={s.rowText}>{t}</Text>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(480).delay(240)} style={s.footer}>
          <Pressable onPress={openForm} style={({ pressed }) => [s.btn, pressed && { transform: [{ scale: 0.985 }] }]}>
            <Text style={s.btnText}>Apply to be featured</Text>
          </Pressable>
          <Text style={s.note}>Takes about 5 minutes. We reply within a week.</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.porcelain },
  safe: { flex: 1 },
  back: {
    marginTop: 12, marginLeft: 24, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  h: { fontFamily: Fonts.heading, fontSize: 34, lineHeight: 40, color: '#FFFEF7' },
  hEm: { fontFamily: Fonts.headingSemi, fontStyle: 'italic', color: '#E6BEF5' },
  p: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,254,247,0.62)', marginTop: 12 },
  card: {
    marginTop: 28, borderRadius: 22, paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  num: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(118,67,172,0.45)',
  },
  numText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: '#FFFFFF' },
  rowText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: '#FFFEF7' },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  btn: {
    height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 16, color: '#FFFFFF' },
  note: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,254,247,0.5)', textAlign: 'center', marginTop: 12 },
});
