// components/HaloBackground.tsx
// Halea = halo. A ring of light hangs just above the top of every screen,
// breathing slowly, with a soft violet wash underneath. This is the one
// signature visual in the app — it's also what makes the glass cards read
// as glass, since glass needs light behind it to show.
//
// Place as the FIRST child of a screen's root View. pointerEvents="none",
// so it never blocks taps.

import { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Rect } from 'react-native-svg';

const { width: W } = Dimensions.get('window');
const RING = W * 1.45;          // ring diameter, wider than the screen
const RING_TOP = -RING * 0.6;   // most of the ring sits above the screen; its lower arc shows

export function HaloBackground() {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + breathe.value * 0.2,
    transform: [{ scale: 1 + breathe.value * 0.025 }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* violet wash from the top */}
      <Svg width={W} height={W * 1.3} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wash" cx="50%" cy="0%" rx="75%" ry="60%">
            <Stop offset="0%" stopColor="#7643AC" stopOpacity={0.45} />
            <Stop offset="100%" stopColor="#7643AC" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={W * 1.3} fill="url(#wash)" />
      </Svg>

      <Animated.View
        style={[
          { position: 'absolute', width: RING, height: RING, top: RING_TOP, left: (W - RING) / 2 },
          ringStyle,
        ]}
      >
        {/* soft bloom around the ring */}
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
              <Stop offset="78%" stopColor="#C38CD9" stopOpacity={0} />
              <Stop offset="85%" stopColor="#C38CD9" stopOpacity={0.45} />
              <Stop offset="90%" stopColor="#F484B9" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#7643AC" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={RING / 2} cy={RING / 2} r={RING / 2} fill="url(#bloom)" />
        </Svg>
        {/* the bright ring line itself */}
        <View
          style={{
            position: 'absolute',
            top: RING * 0.07, left: RING * 0.07, right: RING * 0.07, bottom: RING * 0.07,
            borderRadius: RING,
            borderWidth: 1.5,
            borderColor: 'rgba(255,254,247,0.45)',
            shadowColor: '#C38CD9',
            shadowOpacity: 0.9,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </Animated.View>
    </View>
  );
}
