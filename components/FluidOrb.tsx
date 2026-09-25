// components/FluidOrb.tsx
// Extracted from app/index.tsx so the same fluid, glowy, rotating+breathing
// background can be reused across every screen, not just the splash.
// Organic (non-circular) SVG shape, radial-gradient filled, whole-View
// rotation + scale (not path-morphing) — reliable, no interpolation risk.

import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';

const BLOB_PATH =
  'M100,15 C130,10 165,35 172,70 C179,105 165,140 135,162 ' +
  'C105,184 65,180 40,155 C15,130 8,90 25,58 C42,26 70,20 100,15 Z';

type Props = {
  color: string;
  size: number;
  top: number;
  left: number;
  spinDuration?: number;
  spinDirection?: 1 | -1;
  breatheDuration?: number;
  baseOpacity?: number;
};

export function FluidOrb({
  color, size, top, left,
  spinDuration = 4000, spinDirection = 1, breatheDuration = 1100, baseOpacity = 0.35,
}: Props) {
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: spinDuration, easing: Easing.linear }), -1, false);
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: breatheDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: breatheDuration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const deg = spin.value * 360 * spinDirection;
    const scale = 0.94 + breathe.value * 0.14;
    return { transform: [{ rotate: `${deg}deg` }, { scale }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, { position: 'absolute', top, left, width: size, height: size, opacity: baseOpacity }]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <Stop offset="60%" stopColor={color} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={BLOB_PATH} fill="url(#glow)" />
      </Svg>
    </Animated.View>
  );
}
