// components/HaleaWordmark.tsx
// The "halea" wordmark in Plus Jakarta Sans ExtraBold, as fixed shapes so it
// looks the same on every phone. Entrance: the outline of each letter draws
// itself, the colour rises up to fill the letters, the outline fades, then a
// small sparkle catches on the last letter.
//
//   <HaleaWordmark width=240 />            animated entrance
//   <HaleaWordmark width=120 animate={false} />   static (headers)

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle, withDelay, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const VB_W = 2516;
const VB_Y = -780;
const VB_H = 800;

const GLYPHS = [
  { d: 'M55 0V-757H205V-438L187 -462Q206 -511 248.5 -534.5Q291 -558 348 -558Q410 -558 456.5 -532.0Q503 -506 529.0 -459.5Q555 -413 555 -351V0H405V-319Q405 -351 392.5 -374.0Q380 -397 357.5 -410.0Q335 -423 305 -423Q276 -423 253.0 -410.0Q230 -397 217.5 -374.0Q205 -351 205 -319V0Z', len: 3400 },
  { d: 'M793 12Q734 12 691.0 -7.0Q648 -26 625.0 -61.5Q602 -97 602 -146Q602 -192 623.0 -227.5Q644 -263 687.5 -287.0Q731 -311 796 -321L963 -348V-238L823 -213Q791 -207 774.0 -192.5Q757 -178 757 -151Q757 -126 776.0 -112.0Q795 -98 823 -98Q860 -98 888.0 -114.0Q916 -130 931.5 -157.5Q947 -185 947 -218V-360Q947 -391 922.5 -412.0Q898 -433 856 -433Q816 -433 785.5 -411.0Q755 -389 741 -353L621 -410Q637 -456 672.0 -489.0Q707 -522 756.0 -540.0Q805 -558 863 -558Q932 -558 985.0 -533.0Q1038 -508 1067.5 -463.5Q1097 -419 1097 -360V0H957V-88L991 -94Q967 -58 938.0 -34.5Q909 -11 873.0 0.5Q837 12 793 12Z', len: 3438 },
  { d: 'M1177 0V-757H1327V0Z', len: 1814 },
  { d: 'M1670 12Q1583 12 1519.0 -26.5Q1455 -65 1420.0 -130.0Q1385 -195 1385 -274Q1385 -356 1421.5 -420.0Q1458 -484 1520.0 -521.0Q1582 -558 1660 -558Q1725 -558 1775.0 -537.5Q1825 -517 1859.5 -480.0Q1894 -443 1912.0 -394.5Q1930 -346 1930 -289Q1930 -273 1928.5 -257.5Q1927 -242 1923 -231H1514V-341H1838L1767 -289Q1777 -332 1766.0 -365.5Q1755 -399 1727.5 -418.5Q1700 -438 1660 -438Q1621 -438 1593.0 -419.0Q1565 -400 1551.0 -363.0Q1537 -326 1540 -273Q1536 -227 1551.0 -192.0Q1566 -157 1597.0 -137.5Q1628 -118 1672 -118Q1712 -118 1740.5 -134.0Q1769 -150 1785 -178L1905 -121Q1889 -81 1854.5 -51.0Q1820 -21 1773.0 -4.5Q1726 12 1670 12Z', len: 3549 },
  { d: 'M2157 12Q2098 12 2055.0 -7.0Q2012 -26 1989.0 -61.5Q1966 -97 1966 -146Q1966 -192 1987.0 -227.5Q2008 -263 2051.5 -287.0Q2095 -311 2160 -321L2327 -348V-238L2187 -213Q2155 -207 2138.0 -192.5Q2121 -178 2121 -151Q2121 -126 2140.0 -112.0Q2159 -98 2187 -98Q2224 -98 2252.0 -114.0Q2280 -130 2295.5 -157.5Q2311 -185 2311 -218V-360Q2311 -391 2286.5 -412.0Q2262 -433 2220 -433Q2180 -433 2149.5 -411.0Q2119 -389 2105 -353L1985 -410Q2001 -456 2036.0 -489.0Q2071 -522 2120.0 -540.0Q2169 -558 2227 -558Q2296 -558 2349.0 -533.0Q2402 -508 2431.5 -463.5Q2461 -419 2461 -360V0H2321V-88L2355 -94Q2331 -58 2302.0 -34.5Q2273 -11 2237.0 0.5Q2201 12 2157 12Z', len: 3438 },
];

type Props = {
  width?: number;
  color?: string;        // fill colour
  outline?: string;      // outline colour while drawing
  animate?: boolean;
  delay?: number;        // ms before the entrance starts
  sparkle?: boolean;
  onDone?: () => void;   // called when the entrance finishes
};

// Timings (ms)
const DRAW = 1300;
const FILL_AT = 1000;
const FILL = 900;
const SPARKLE_AT = 2000;

function Outline({ d, len, progress, color }: { d: string; len: number; progress: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - progress.value),
  }));
  return <AnimatedPath d={d} fill="none" stroke={color} strokeWidth={14} strokeDasharray={[len, len]} animatedProps={props} />;
}

export function HaleaWordmark({
  width = 240, color = '#C38CD9', outline = '#C38CD9', animate = true, delay = 0, sparkle = true, onDone,
}: Props) {
  const height = (width * VB_H) / VB_W;
  const draw = useSharedValue(animate ? 0 : 1);
  const outlineOpacity = useSharedValue(animate ? 1 : 0);
  const fill = useSharedValue(animate ? 0 : 1);
  const spark = useSharedValue(animate ? 0 : 0.75);

  useEffect(() => {
    if (!animate) return;
    const ease = Easing.inOut(Easing.cubic);
    draw.value = withDelay(delay, withTiming(1, { duration: DRAW, easing: ease }));
    fill.value = withDelay(delay + FILL_AT, withTiming(1, { duration: FILL, easing: Easing.out(Easing.cubic) }));
    outlineOpacity.value = withDelay(delay + FILL_AT + FILL, withTiming(0, { duration: 500 }));
    spark.value = withDelay(delay + SPARKLE_AT, withSequence(
      withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2)) }),
      withTiming(0.75, { duration: 600 }),
    ));
    if (onDone) {
      const t = setTimeout(onDone, delay + SPARKLE_AT + 400);
      return () => clearTimeout(t);
    }
  }, []);

  // Colour rises from the bottom: a clipping box that grows upward
  const fillBox = useAnimatedStyle(() => ({ height: height * fill.value }));
  const outlineStyle = useAnimatedStyle(() => ({ opacity: outlineOpacity.value }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: spark.value,
    transform: [{ scale: 0.4 + spark.value * 0.6 }, { rotate: `${spark.value * 90}deg` }],
  }));

  const s = Math.max(10, width * 0.06); // sparkle size
  return (
    <View style={{ width, height }}>
      {/* Filled letters, revealed bottom-up */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, fillBox]}>
        <Svg width={width} height={height} viewBox={`0 ${VB_Y} ${VB_W} ${VB_H}`} style={{ position: 'absolute', bottom: 0 }}>
          <G fill={color}>
            {GLYPHS.map((g, i) => <Path key={i} d={g.d} />)}
          </G>
        </Svg>
      </Animated.View>

      {/* Outline that draws itself */}
      {animate && (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, outlineStyle]} pointerEvents="none">
          <Svg width={width} height={height} viewBox={`0 ${VB_Y} ${VB_W} ${VB_H}`}>
            {GLYPHS.map((g, i) => <Outline key={i} d={g.d} len={g.len} progress={draw} color={outline} />)}
          </Svg>
        </Animated.View>
      )}

      {/* Small four-point sparkle above the final "a" */}
      {sparkle && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: s, height: s, right: -s * 0.55, top: -s * 0.35 }, sparkStyle]}>
          <Svg width={s} height={s} viewBox="0 0 24 24">
            <Path d="M12 0 C12.8 7.5 16.5 11.2 24 12 C16.5 12.8 12.8 16.5 12 24 C11.2 16.5 7.5 12.8 0 12 C7.5 11.2 11.2 7.5 12 0 Z" fill="#FFFEF7" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
