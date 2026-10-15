// app/index.tsx
// Splash for returning users: the halea wordmark draws itself over the slow
// orbs, fills with lavender, a small sparkle catches, then the tagline.
// New visitors go straight to the intro, which has the same reveal.

import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { HaleaWordmark } from '@/components/HaleaWordmark';
import { HaloBackground } from '@/components/HaloBackground';
import { FluidOrb } from '@/components/FluidOrb';
import { Colors } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const signedIn = useRef<boolean | null>(null);
  const revealDone = useRef(false);
  const left = useRef(false);

  const goHomeIfReady = () => {
    if (left.current || !revealDone.current || signedIn.current !== true) return;
    left.current = true;
    setTimeout(() => router.replace('/(tabs)/home'), 700);
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        left.current = true;
        router.replace('/onboarding');
        return;
      }
      signedIn.current = true;
      goHomeIfReady();
    }).catch(() => { if (!cancelled) router.replace('/onboarding'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <HaloBackground />
      <FluidOrb color={Colors.violet} size={620} top={-140} left={-160} spinDuration={18000} spinDirection={1} breatheDuration={4500} baseOpacity={0.42} />
      <FluidOrb color={Colors.pink} size={480} top={260} left={40} spinDuration={22000} spinDirection={-1} breatheDuration={5200} baseOpacity={0.30} />
      <View style={styles.center}>
        <HaleaWordmark
          width={230}
          delay={250}
          onDone={() => { revealDone.current = true; goHomeIfReady(); }}
        />
        <Animated.Text entering={FadeInUp.duration(600).delay(2350)} style={styles.tag}>
          Step into your halo.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#120B2E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tag: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 22,
    color: 'rgba(255,254,247,0.8)',
    marginTop: 24,
  },
});
