// components/Rating.tsx
// A stylist's public rating: star, score, and how many reviews it comes from.
// Always shows the source (Fresha, Booksy, Google) so it's clear where it's from.

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

export function Star({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={filled ? '#F5C76B' : 'transparent'} stroke={filled ? '#F5C76B' : 'rgba(255,254,247,0.3)'} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} filled={i <= Math.round(value)} />)}
    </View>
  );
}

export function RatingLine({ rating, count, source }: { rating: number; count?: number | null; source?: string | null }) {
  const detail = [count ? `${count} reviews` : '', source ? `on ${source}` : ''].filter(Boolean).join(' ');
  return (
    <View style={st.row} accessibilityLabel={`Rated ${rating} out of 5${detail ? `, ${detail}` : ''}`}>
      <Star />
      <Text style={st.score}>{rating.toFixed(1)}</Text>
      {detail ? <Text style={st.detail}>{detail}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: Colors.ink },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginLeft: 2 },
});
