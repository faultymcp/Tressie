// app/onboarding.tsx
// First impression. Light falls from the halo, a glow blooms, and "Halea"
// forms letter by letter inside it. Then "Step into your halo." and the two
// paths: customers go to sign in, stylists go to the application screen.
// Replaces the old three text-heavy slides and the separate account-type step.

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, withRepeat, withSequence, Easing, FadeInUp,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';
import { LightRays, RadiantCore } from '@/components/RadiantLight';

const { height: H } = Dimensions.get('window');
const LETTERS = 'Halea'.split('');
const LETTER_START = 700;   // ms before the first letter appears
const LETTER_STEP = 150;    // ms between letters
const NAME_DONE = LETTER_START + LETTERS.length * LETTER_STEP + 300;
const EASE = Easing.out(Easing.cubic);

function FormingLetter({ ch, delay }: { ch: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 520, easing: EASE }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 14 }],
  }));
  return <Animated.Text style={[s.letter, style]}>{ch}</Animated.Text>;
}

// Option C: a pair of glints framing the finished name, top-right and
// bottom-left, twinkling a beat apart. Neither overlaps a letter.
function HaloGlint({ delay, size = 30, style: pos }: { delay: number; size?: number; style?: object }) {
  const v = useSharedValue(0);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: 700, easing: EASE }));
    shimmer.value = withDelay(delay + 700, withRepeat(withSequence(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: v.value * (0.65 + shimmer.value * 0.35),
    transform: [
      { translateY: (1 - v.value) * 10 },
      { scale: (0.3 + v.value * 0.7) * (0.9 + shimmer.value * 0.15) },
      { rotate: `${v.value * 45}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[s.glint, { width: size, height: size }, pos, style]}>
      <LinearGradient colors={['transparent', '#FFFFFF', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', width: size, height: 2, borderRadius: 1 }} />
      <LinearGradient colors={['transparent', '#FFFFFF', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', width: 2, height: size, borderRadius: 1 }} />
      <View style={[s.glintCore, { width: size * 0.24, height: size * 0.24, borderRadius: size * 0.12 }]} />
    </Animated.View>
  );
}

export default function Intro() {
  const router = useRouter();
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withTiming(1, { duration: 1200, easing: EASE });
    // A single soft tap the moment the name completes.
    const t = setTimeout(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }, NAME_DONE);
    return () => clearTimeout(t);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const coreStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.7 }));

  const chooseCustomer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await AsyncStorage.setItem('halea_role', 'customer').catch(() => {});
    router.push({ pathname: '/auth', params: { role: 'customer' } });
  };

  const chooseStylist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/stylist');
  };

  return (
    <View style={s.root}>
      <HaloBackground />
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <LightRays />
      </Animated.View>

      <View style={s.center}>
        <Animated.View style={[s.core, coreStyle]} pointerEvents="none">
          <RadiantCore size={280} glint={false} />
        </Animated.View>
        <View style={s.nameRow}>
          {LETTERS.map((ch, i) => (
            <FormingLetter key={i} ch={ch} delay={LETTER_START + i * LETTER_STEP} />
          ))}
          <HaloGlint delay={NAME_DONE} size={30} style={{ position: 'absolute', top: -6, right: -26 }} />
          <HaloGlint delay={NAME_DONE + 600} size={18} style={{ position: 'absolute', bottom: 8, left: -22 }} />
        </View>
        <Animated.Text entering={FadeInUp.duration(600).delay(NAME_DONE + 200)} style={s.tag}>
          Step into your halo
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.duration(600).delay(NAME_DONE + 900)} style={s.choices}>
        <Pressable onPress={chooseCustomer} style={({ pressed }) => [s.primaryWrap, pressed && s.pressed]}>
          <LinearGradient
            colors={['#7643AC', '#A45BC9', '#F484B9']}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={s.primary}
          >
            <Text style={s.primaryText}>Step in</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={chooseStylist} hitSlop={10} style={s.stylistLink}>
          <Text style={s.stylistText}>
            Are you a stylist? <Text style={s.stylistEm}>Show us your work</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.porcelain },
  center: { position: 'absolute', left: 0, right: 0, top: H * 0.3, alignItems: 'center' },
  core: { position: 'absolute', top: -103, alignSelf: 'center' },
  nameRow: { flexDirection: 'row' },
  letter: {
    fontFamily: Fonts.heading, fontSize: 64, lineHeight: 74, letterSpacing: -1.5, color: '#FFFEF7',
    textShadowColor: 'rgba(230,190,245,0.7)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 },
  },
  tag: {
    fontFamily: Fonts.headingSemi, fontStyle: 'italic', fontSize: 21, color: 'rgba(255,254,247,0.85)', marginTop: 14,
  },
  glint: { alignItems: 'center', justifyContent: 'center' },
  glintCore: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#E6BEF5', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  choices: { position: 'absolute', left: 24, right: 24, bottom: 52, alignItems: 'center' },
  primaryWrap: {
    alignSelf: 'stretch', borderRadius: 999,
    shadowColor: '#C38CD9', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
  },
  primary: { height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: Fonts.bodySemi, fontSize: 17, color: '#FFFFFF', letterSpacing: 0.3 },
  pressed: { transform: [{ scale: 0.985 }] },
  stylistLink: { marginTop: 22, paddingVertical: 6 },
  stylistText: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,254,247,0.55)' },
  stylistEm: { fontFamily: Fonts.bodySemi, color: '#E6BEF5' },
});