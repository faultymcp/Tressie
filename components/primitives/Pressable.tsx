// components/primitives/Pressable.tsx
// Drop-in replacement for React Native's Pressable, used by every screen.
// Same props, plus three things every good app does on touch:
//   1. A visible press: the item dips to 97% and dims slightly while held,
//      so you always know the tap landed.
//   2. A slightly bigger touch area (4pt extra each side) without overlapping neighbours.
//   3. An optional haptic: <Pressable haptic="select" ...>. See lib/haptics.ts.
//
// Pass pressScale={1} to switch the dip off (for big full-screen areas).

import { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
  type View,
  type GestureResponderEvent,
} from 'react-native';
import { haptics, type HapticKind } from '@/lib/haptics';

type Props = PressableProps & {
  haptic?: HapticKind;
  pressScale?: number;
};

const Pressable = forwardRef<View, Props>(function Pressable(
  { haptic, pressScale = 0.97, style, onPress, hitSlop = 4, disabled, ...rest },
  ref,
) {
  const handlePress = onPress
    ? (e: GestureResponderEvent) => {
        if (haptic) haptics[haptic]();
        onPress(e);
      }
    : undefined;

  const resolvedStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const base = typeof style === 'function' ? style(state) : style;
    if (!state.pressed || disabled || pressScale === 1) return base;
    return [base, { transform: [{ scale: pressScale }], opacity: 0.88 }];
  };

  return (
    <RNPressable
      ref={ref}
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={handlePress}
      style={resolvedStyle}
    />
  );
});

export default Pressable;
