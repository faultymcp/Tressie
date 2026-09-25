// app/name.tsx
// "What should we call you?" — right after sign-up, before the quiz, so the
// quiz can greet them by name and the reveal can speak to them personally.
// Saves to AsyncStorage 'halea_user' as { firstName, capturedAt } — the same
// shape Home, Profile and the reveal already read.

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';

export default function NameScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');

  const trimmed = firstName.trim();
  const canContinue = trimmed.length >= 1 && trimmed.length <= 60;

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await AsyncStorage.setItem(
        'halea_user',
        JSON.stringify({ firstName: trimmed, capturedAt: new Date().toISOString() })
      );
    } catch (e) {
      // Non-blocking: screens fall back to "You" if the name isn't there.
    }
    router.replace('/quiz');
  }, [trimmed, canContinue, router]);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <HaloBackground />
      <View style={s.body}>
        <Animated.Text entering={FadeInUp.duration(480)} style={s.title}>
          What should we <Text style={s.titleEm}>call you?</Text>
        </Animated.Text>
        <Animated.Text entering={FadeInUp.duration(480).delay(80)} style={s.sub}>
          Just your first name is perfect.
        </Animated.Text>

        <Animated.View entering={FadeInUp.duration(480).delay(160)} style={[s.field, trimmed.length > 0 && s.fieldActive]}>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            placeholderTextColor="rgba(255,254,247,0.4)"
            autoCapitalize="words"
            autoComplete="given-name"
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
            maxLength={60}
          />
        </Animated.View>

        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [s.btn, !canContinue && s.btnOff, pressed && canContinue && { transform: [{ scale: 0.985 }] }]}
        >
          <Text style={s.btnText}>Continue</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontFamily: Fonts.heading, fontSize: 34, lineHeight: 40, color: '#FFFEF7' },
  titleEm: { fontFamily: Fonts.headingSemi, fontStyle: 'italic', color: '#E6BEF5' },
  sub: { fontFamily: Fonts.body, fontSize: 15, color: 'rgba(255,254,247,0.62)', marginTop: 10, marginBottom: 28 },
  field: {
    height: 58, borderRadius: 18, paddingHorizontal: 18, justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  fieldActive: { borderColor: 'rgba(230,190,245,0.6)' },
  input: { fontFamily: Fonts.body, fontSize: 18, color: '#FFFEF7' },
  btn: {
    height: 58, borderRadius: 999, marginTop: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnOff: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 16, color: '#FFFFFF' },
});
