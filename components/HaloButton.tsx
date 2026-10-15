// components/HaloButton.tsx
// Halea's one primary button: a cream pill with a soft rainbow halo
// bleeding out around its edge. Use it for the single main action on a
// screen. Everything else stays quiet (outline or text buttons).

import { View, Text, Pressable, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '@/lib/haptics';

const HALO = ['#F484B9', '#C38CD9', '#E6BEF5', '#C38CD9'] as const;

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function HaloButton({ label, onPress, disabled, loading, style, accessibilityLabel }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [st.wrap, style, pressed && !off && { transform: [{ scale: 0.98 }] }]}
    >
      {!disabled && (
        <>
          {/* wide faint bleed, then a tighter brighter rim */}
          <LinearGradient colors={HALO} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[st.glow, st.glowWide]} />
          <LinearGradient colors={HALO} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[st.glow, st.glowRim]} />
        </>
      )}
      <View style={[st.pill, disabled && st.pillOff]}>
        {loading ? (
          <ActivityIndicator color="#120B2E" />
        ) : (
          <Text style={[st.label, disabled && st.labelOff]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: {
    height: 56,
    justifyContent: 'center',
    shadowColor: '#C38CD9',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  glow: { position: 'absolute', borderRadius: 999 },
  glowWide: { top: -9, bottom: -9, left: -9, right: -9, opacity: 0.16 },
  glowRim: { top: -2, bottom: -2, left: -2, right: -2, opacity: 0.7 },
  pill: {
    flex: 1, borderRadius: 999, backgroundColor: '#FFFEF7',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  pillOff: { backgroundColor: 'rgba(255,254,247,0.14)' },
  label: { fontFamily: 'Sora_600SemiBold', fontSize: 16, color: '#120B2E', letterSpacing: 0.2 },
  labelOff: { color: 'rgba(255,254,247,0.45)' },
});
