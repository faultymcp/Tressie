import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthStep = 'email' | 'otp';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = params.role === 'business' ? 'business' : 'customer';
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // ─── Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: trimmed });
      if (error) throw error;
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────
  const verifyCode = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (error) throw error;

      // Post-verify: sync quiz data + bootstrap the user's routine, then route.
      // First-time users (no routine yet) see the reveal; returning users go home.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Was this user already set up before this verify?
        let isReturning = false;
        if (userId) {
          const { count } = await supabase
            .from('user_routines')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          isReturning = (count ?? 0) > 0;
        }

        // Sync quiz answers to Supabase (no-op if nothing cached).
        const { syncQuizToSupabase } = require('@/lib/sync');
        await syncQuizToSupabase();

        // Bootstrap routine from quiz goals/segments if not already present.
        if (userId && !isReturning) {
          const raw = await AsyncStorage.getItem('halea_user');
          const quiz = raw ? JSON.parse(raw) : {};
          const goals = quiz?.goals || [];
          const segs = quiz?.segments || ['natural'];
          const { bootstrapUserRoutine } = require('@/lib/routines');
          await bootstrapUserRoutine(userId, goals, segs);
        }

        if (role === 'business') {
          // Salon owners skip the hair quiz entirely.
          const { data: salon } = await supabase
            .from('salons')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();
          router.replace(salon ? '/(tabs)/salons' : '/business');
        } else {
          router.replace(isReturning ? '/(tabs)/home' : '/name');
        }
      } catch (routeErr) {
        // If post-verify setup fails, still get the user into the app.
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    verifyCode(code);
  };

  // ─── OTP handlers ─────────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    const digits = text.replace(/[^0-9]/g, '');
    setError('');

    // iOS one-tap autofill (or a paste) delivers the whole code at once:
    // spread it across the boxes and sign in straight away.
    if (digits.length > 1) {
      const code = digits.slice(0, 6).split('');
      const filled = [...code, ...Array(6 - code.length).fill('')];
      setOtp(filled);
      if (code.length === 6) {
        otpRefs.current[5]?.blur();
        setTimeout(() => verifyCode(code.join('')), 200);
      } else {
        otpRefs.current[Math.min(code.length, 5)]?.focus();
      }
      return;
    }

    const digit = digits.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = newOtp.join('');
      if (code.length === 6) {
        setTimeout(() => verifyCode(code), 200);
      }
    }
  };


  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    handleSendOtp();
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  // ─── Shared chrome: halo above, back button ───────────────────
  const BackBtn = ({ onPress }: { onPress: () => void }) => (
    <Pressable onPress={onPress} style={styles.back} hitSlop={10}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
        <Path d="M15 18l-6-6 6-6" />
      </Svg>
    </Pressable>
  );

  // ─── OTP Screen ───────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <HaloBackground />
        <BackBtn onPress={handleChangeEmail} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Check your <Text style={styles.titleEm}>inbox.</Text></Text>
          <Text style={styles.subtitle}>
            We sent a six-digit code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { otpRefs.current[i] = ref; }}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null, error ? styles.otpInputError : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? 6 : 1}
                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable onPress={handleVerifyOtp} disabled={loading}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}>
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Continue</Text>}
          </Pressable>

          <View style={styles.row}>
            <Pressable onPress={handleResend} disabled={loading}><Text style={styles.link}>Resend code</Text></Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable onPress={handleChangeEmail}><Text style={styles.link}>Change email</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Email Screen ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <HaloBackground />
      <BackBtn onPress={() => (router.canGoBack() ? router.back() : router.replace('/onboarding'))} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Let's get you <Text style={styles.titleEm}>in.</Text></Text>
        <Text style={styles.subtitle}>
          {role === 'business'
            ? 'Sign in to set up your salon listing.'
            : "No password to remember. We'll email you a six-digit code."}
        </Text>

        <View style={[styles.field, email.length > 0 && styles.fieldActive]}>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="rgba(255,254,247,0.4)"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={handleSendOtp}
            editable={!loading}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable onPress={handleSendOtp} disabled={loading}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Send my code</Text>}
        </Pressable>

        <Text style={styles.note}>New here or coming back, it's the same step.</Text>
      </ScrollView>

      <Text style={styles.legal}>
        By continuing you agree to our{' '}
        <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>Terms and Privacy Policy</Text>.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  back: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 36, left: 24, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 120, paddingBottom: 60 },
  title: { fontFamily: Fonts.heading, fontSize: 34, lineHeight: 40, color: '#FFFEF7' },
  titleEm: { fontFamily: Fonts.headingSemi, fontStyle: 'italic', color: '#E6BEF5' },
  subtitle: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,254,247,0.62)', marginTop: 12, marginBottom: 28 },
  email: { fontFamily: Fonts.bodySemi, color: '#FFFEF7' },

  field: {
    height: 58, borderRadius: 18, paddingHorizontal: 18, justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  fieldActive: { borderColor: 'rgba(230,190,245,0.6)' },
  input: { fontFamily: Fonts.body, fontSize: 16, color: '#FFFEF7' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpInput: {
    flex: 1, height: 58, borderRadius: 16, textAlign: 'center',
    fontFamily: Fonts.heading, fontSize: 24, color: '#FFFEF7',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  otpInputFilled: { borderColor: 'rgba(230,190,245,0.7)', backgroundColor: 'rgba(118,67,172,0.25)' },
  otpInputError: { borderColor: '#F87171' },

  errorText: { fontFamily: Fonts.body, fontSize: 13, color: '#F87171', marginTop: 12 },

  btn: {
    height: 58, borderRadius: 999, marginTop: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7643AC',
    shadowColor: '#C38CD9', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  btnPressed: { transform: [{ scale: 0.985 }] },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 16, color: '#FFFFFF' },

  note: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,254,247,0.5)', textAlign: 'center', marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 },
  link: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: '#E6BEF5' },
  dot: { color: 'rgba(255,254,247,0.4)' },

  legal: {
    position: 'absolute', bottom: 36, left: 40, right: 40, textAlign: 'center',
    fontFamily: Fonts.body, fontSize: 11, lineHeight: 16, color: 'rgba(255,254,247,0.38)',
  },
  legalLink: { color: 'rgba(255,254,247,0.65)', textDecorationLine: 'underline' },
});
