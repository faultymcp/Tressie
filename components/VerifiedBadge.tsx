// components/VerifiedBadge.tsx
// "Halea verified": shown on stylists Halea has checked (portfolio is their own
// work, a call, ID). Set stylists.verified = true in Supabase once checked.
// See docs/STYLIST_ONBOARDING.md.

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';

export function VerifiedBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={st.badge} accessibilityLabel="Halea verified stylist">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" fill={Colors.lavender} />
        <Path d="M7.5 12.5l3 3 6-6.5" stroke="#120B2E" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {!compact && <Text style={st.text}>Halea verified</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingVertical: 4, paddingLeft: 4, paddingRight: 8, borderRadius: 999,
    backgroundColor: 'rgba(195,140,217,0.16)', borderWidth: 1, borderColor: 'rgba(195,140,217,0.4)',
  },
  text: { fontFamily: 'Sora_500Medium', fontSize: 11, color: Colors.lavender },
});
