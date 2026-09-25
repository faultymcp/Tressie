// components/RadiantLight.tsx
// The chat screen's "entering somewhere radiant" moment.
//   <LightRays />   — soft rays falling from the halo above. Absolute, full screen.
//   <RadiantCore /> — Halea's presence: a bright point of light that blooms,
//                     with a soft cross-shaped glint and motes drifting up.
// Built with react-native-svg + reanimated + expo-linear-gradient only —
// all already installed, all run in Expo Go.

import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop, Polygon, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

// ─── Rays ─────────────────────────────────────────────────────────
const RAY_COUNT = 11;
const RAY_LEN = H * 0.75;

export function LightRays() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.45,
    transform: [{ rotate: `${-1.2 + t.value * 2.4}deg` }],
  }));

  const cx = W / 2;
  const cy = -30; // rays originate just above the screen, where the halo is
  const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = (-38 + (76 / (RAY_COUNT - 1)) * i) * (Math.PI / 180);
    const spread = 0.022 + (i % 3) * 0.008; // slightly uneven widths look more natural
    const a1 = angle - spread, a2 = angle + spread;
    const p1 = `${cx + Math.sin(a1) * RAY_LEN},${cy + Math.cos(a1) * RAY_LEN}`;
    const p2 = `${cx + Math.sin(a2) * RAY_LEN},${cy + Math.cos(a2) * RAY_LEN}`;
    return `${cx},${cy} ${p1} ${p2}`;
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgLinearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFF4FF" stopOpacity={0.22} />
            <Stop offset="55%" stopColor="#E6BEF5" stopOpacity={0.07} />
            <Stop offset="100%" stopColor="#E6BEF5" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {rays.map((pts, i) => <Polygon key={i} points={pts} fill="url(#ray)" />)}
      </Svg>
    </Animated.View>
  );
}

// ─── Core ─────────────────────────────────────────────────────────
function Mote({ x, delay }: { x: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 6000, easing: Easing.in(Easing.quad) }), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.2 ? p.value * 4.5 : (1 - p.value) * 1.1,
    transform: [{ translateY: -p.value * 150 }],
  }));
  return <Animated.View style={[st.mote, { left: x }, style]} />;
}

export function RadiantCore({ size = 220 }: { size?: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + pulse.value * 0.15,
    transform: [{ scale: 0.92 + pulse.value * 0.16 }],
  }));

  const half = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
        {/* bloom */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="core" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFAFF" stopOpacity={0.95} />
              <Stop offset="12%" stopColor="#E6BEF5" stopOpacity={0.7} />
              <Stop offset="32%" stopColor="#C38CD9" stopOpacity={0.35} />
              <Stop offset="55%" stopColor="#F484B9" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#7643AC" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={half} cy={half} r={half} fill="url(#core)" />
        </Svg>
        {/* cross glint */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.95)', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', width: size * 0.95, height: 3, borderRadius: 2 }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.95)', 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', width: 3, height: size * 0.7, borderRadius: 2 }}
        />
      </Animated.View>
      {/* motes drifting up from the core */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: half }]}>
        <Mote x={half - 60} delay={0} />
        <Mote x={half + 25} delay={1400} />
        <Mote x={half - 15} delay={2800} />
        <Mote x={half - 85} delay={4000} />
        <Mote x={half + 60} delay={700} />
        <Mote x={half + 5} delay={3500} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  mote: {
    position: 'absolute',
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#E6BEF5', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
});
