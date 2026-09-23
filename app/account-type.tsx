// app/account-type.tsx
// Splits the two audiences before sign-in. The choice is stored so auth
// knows where to send the user once the code is verified.

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Motion } from '@/constants/theme';

type Role = 'customer' | 'business';

const OPTIONS: { role: Role; title: string; body: string }[] = [
  {
    role: 'customer',
    title: 'I want help with my hair',
    body: 'Answer a few questions and get a routine built around your texture, scalp and history.',
  },
  {
    role: 'business',
    title: 'I run a salon or style hair',
    body: 'List your business, set your specialities, and get matched to clients whose hair you work with.',
  },
];

export default function AccountType() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);

  const choose = (role: Role) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(role);
  };

  const advance = async () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await AsyncStorage.setItem('halea_role', selected).catch(() => {});
    router.push({ pathname: '/auth', params: { role: selected } });
  };

  return (
    <View style={s.container}>
      <View style={s.head}>
        <Text style={s.label}>ONE MORE THING</Text>
        <Text style={s.title}>What brings you here?</Text>
      </View>

      <View style={s.options}>
        {OPTIONS.map((o, i) => (
          <Animated.View key={o.role} entering={FadeIn.delay(i * 70).duration(Motion.medium)}>
            <Pressable
              onPress={() => choose(o.role)}
              style={[s.card, selected === o.role && s.cardOn]}
            >
              <Text style={[s.cardTitle, selected === o.role && s.cardTitleOn]}>{o.title}</Text>
              <Text style={s.cardBody}>{o.body}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <View style={s.footer}>
        <Pressable onPress={advance} disabled={!selected} style={[s.btn, !selected && s.btnOff]}>
          <Text style={s.btnText}>Continue</Text>
        </Pressable>
        <Text style={s.footNote}>You can change this later in settings.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  head: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 88 : 68,
    gap: 10,
  },
  label: {
    fontFamily: Fonts.body, fontSize: 11, letterSpacing: 2.2,
    color: Colors.muted, textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.heading, fontSize: 30, lineHeight: 36,
    color: Colors.ink, letterSpacing: -0.8,
  },

  options: { paddingHorizontal: 24, paddingTop: 32, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 20, paddingVertical: 24,
    gap: 8,
  },
  cardOn: { borderColor: Colors.violet, backgroundColor: Colors.violetBg },
  cardTitle: {
    fontFamily: Fonts.headingSemi, fontSize: 18,
    color: Colors.ink, letterSpacing: -0.3,
  },
  cardTitleOn: { color: Colors.violet },
  cardBody: {
    fontFamily: Fonts.body, fontSize: 14, lineHeight: 22,
    color: Colors.ink, opacity: 0.62,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    paddingTop: 12,
    backgroundColor: Colors.porcelain,
    gap: 12,
  },
  btn: {
    width: '100%', paddingVertical: 16, borderRadius: Radius.lg,
    backgroundColor: Colors.violet, alignItems: 'center',
  },
  btnOff: { opacity: 0.4 },
  btnText: {
    fontFamily: Fonts.headingSemi, fontSize: 15,
    color: Colors.white, letterSpacing: 0.2,
  },
  footNote: {
    fontFamily: Fonts.body, fontSize: 12,
    color: Colors.muted, textAlign: 'center',
  },
});
