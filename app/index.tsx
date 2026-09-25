// app/index.tsx
// Ceremonial screen — deep violet ground per BRAND.md §3.
// Rebuilt Sep 24 with three things: a drifting glow orb (actual movement,
// not just static twinkle), the wordmark forming letter-by-letter instead of
// appearing as one block, and the shimmer sweep now plays after the letters
// finish rather than racing them. Framed as hair shine, not cosmic dressing.

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Motion } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { FluidOrb } from '@/components/FluidOrb';

const EASE = Easing.out(Easing.cubic);
const LETTERS = 'Halea'.split('');

export default function SplashScreen() {
  const router = useRouter();

  const ruleScale = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(-140);

  const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: ruleScale.value }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: '-18deg' }],
  }));

  // Letters finish forming at roughly this point — everything after (rule,
  // shimmer, label) is timed relative to it, not to a fixed guess.
  const LETTERS_DONE = LETTERS.length * 90 + 260;

  useEffect(() => {
    ruleScale.value = withDelay(LETTERS_DONE, withTiming(1, { duration: Motion.slow, easing: EASE }));
    labelOpacity.value = withDelay(LETTERS_DONE + Motion.medium, withTiming(1, { duration: Motion.medium, easing: EASE }));
    // Shimmer plays once the word is actually complete, not while it's still forming.
    shimmerX.value = withDelay(LETTERS_DONE + 150, withTiming(140, { duration: 900, easing: EASE }));

    // New visitors go straight to the intro, which has its own Halea reveal,
    // so they don't watch the name form twice. Signed-in users get the splash.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace('/onboarding');
        return;
      }
      timer = setTimeout(() => router.replace('/(tabs)/home'), 2800);
    }).catch(() => { if (!cancelled) router.replace('/onboarding'); });
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.inkDeep, '#1A1038', Colors.inkDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <FluidOrb color={Colors.violet} size={620} top={-140} left={-160} spinDuration={3400} spinDirection={1} breatheDuration={1000} baseOpacity={0.42} />
      <FluidOrb color={Colors.pink} size={480} top={260} left={40} spinDuration={4200} spinDirection={-1} breatheDuration={1250} baseOpacity={0.30} />

      {TWINKLE_POSITIONS.map((p, i) => (
        <Twinkle key={i} x={p.x} y={p.y} size={p.size} delay={p.delay} />
      ))}

      <View style={styles.stack}>
        <View style={styles.markClip}>
          <View style={styles.markRow}>
            {LETTERS.map((ch, i) => (
              <FormingLetter key={i} delay={i * 90}>{ch}</FormingLetter>
            ))}
          </View>
          <Animated.View pointerEvents="none" style={[styles.shimmerBand, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,254,247,0.35)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <Animated.View style={[styles.rule, ruleStyle]} />

        <Animated.View style={labelStyle}>
          <Text style={styles.label}>Hair care that remembers</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// One letter of the wordmark, appearing on its own delay — this is what
// makes the word feel like it's forming rather than fading in as one block.
function FormingLetter({ children, delay }: { children: string; delay: number }) {
  const opacity = useSharedValue(0);
  const lift = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 260, easing: EASE }));
    lift.value = withDelay(delay, withTiming(0, { duration: 260, easing: EASE }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return <Animated.Text style={[styles.mark, style]}>{children}</Animated.Text>;
}

// Fixed, deliberate positions rather than Math.random() — reproducible across
// reloads, and easy to nudge by hand if one ever sits awkwardly on a device.
const TWINKLE_POSITIONS = [
  { x: 0.18, y: 0.22, size: 3, delay: 0 },
  { x: 0.78, y: 0.18, size: 2, delay: 400 },
  { x: 0.85, y: 0.35, size: 3, delay: 1100 },
  { x: 0.12, y: 0.4, size: 2, delay: 700 },
  { x: 0.65, y: 0.62, size: 2, delay: 1500 },
  { x: 0.25, y: 0.68, size: 3, delay: 200 },
  { x: 0.9, y: 0.58, size: 2, delay: 1800 },
  { x: 0.4, y: 0.15, size: 2, delay: 900 },
];

function Twinkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0.7, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.twinkle,
        style,
        { left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inkDeep,
    overflow: 'hidden',
  },
  stack: { alignItems: 'center' },
  markClip: { overflow: 'hidden' },
  markRow: { flexDirection: 'row' },
  shimmerBand: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 60,
    height: 100,
  },
  twinkle: {
    position: 'absolute',
    backgroundColor: Colors.porcelain,
  },
  mark: {
    fontFamily: Fonts.heading,
    fontSize: 54,
    lineHeight: 60,
    color: Colors.porcelain,
    letterSpacing: -1.6,
  },
  rule: {
    width: 28,
    height: 1,
    marginTop: 20,
    backgroundColor: Colors.lime,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 2.4,
    lineHeight: 16,
    marginTop: 20,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
});
