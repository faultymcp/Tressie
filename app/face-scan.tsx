// app/face-scan.tsx
// Face scan: selfie -> face shape + facial thirds -> styles and colours to try
// -> find a stylist who can do it.
// Detection runs on the phone (ML Kit). The photo is never uploaded or saved.
// Needs a development build (not Expo Go) because of the native face detector.
//
// Two ways in:
//   /face-scan?onboarding=1  first run, between the name screen and the quiz.
//                           Ends with "Continue" into the quiz, and can be skipped.
//   /face-scan               from Profile, any time. Ends with "Find a stylist".
// The result is kept on the phone under 'halea_face_scan' so other screens can use it.

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import FaceDetection from '@react-native-ml-kit/face-detection';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing, Surface, Foreground, BorderTone } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';
import Button from '@/components/primitives/Button';
import {
  analyseFace, SHAPE_INFO, COLOURS, type ScanResult, type ScanProblem, type Undertone,
} from '@/lib/faceScan';
import { track } from '@/lib/analytics';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_W = SCREEN_W - Spacing.xl * 2;
const MIN_SCAN_MS = 1800; // let the scan line run long enough to feel like something happened
const FACE_SCAN_KEY = 'halea_face_scan';

type Photo = { uri: string; width: number; height: number };
type Stage = 'start' | 'scanning' | 'result';

const PROBLEM_TEXT: Record<ScanProblem, string> = {
  'no-face': "We couldn't find a face. Try a brighter spot, facing the camera.",
  'no-outline': "We couldn't read your face outline. Pull your hair back off your face and try again.",
  turned: 'Your head is turned a little. Look straight at the camera and try again.',
};

export default function FaceScanScreen() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const inOnboarding = onboarding === '1';
  const [stage, setStage] = useState<Stage>('start');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [undertone, setUndertone] = useState<Undertone | null>(null);

  // Keep the latest result on the phone (shape, thirds, undertone). Never the photo.
  useEffect(() => {
    if (!result) return;
    AsyncStorage.setItem(FACE_SCAN_KEY, JSON.stringify({
      shape: result.shape,
      thirds: result.thirds,
      undertone,
      scannedAt: new Date().toISOString(),
    })).catch(() => {});
  }, [result, undertone]);

  const goToQuiz = () => router.replace('/quiz');

  const scan = async (p: Photo) => {
    setPhoto(p);
    setResult(null);
    setStage('scanning');
    const started = Date.now();
    try {
      const faces = await FaceDetection.detect(p.uri, {
        performanceMode: 'accurate',
        contourMode: 'all',
      });
      const r = analyseFace(faces);
      await new Promise(res => setTimeout(res, Math.max(0, MIN_SCAN_MS - (Date.now() - started))));
      if (typeof r === 'string') {
        setStage('start');
        Alert.alert('Let’s try that again', PROBLEM_TEXT[r]);
        return;
      }
      setResult(r);
      setStage('result');
      track('face_scan_done');
    } catch (e) {
      setStage('start');
      Alert.alert('Something went wrong', 'The scan could not run. Please try again.');
    }
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera needed', 'Allow camera access in Settings to scan your face.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    const a = res.canceled ? null : res.assets[0];
    if (a) scan({ uri: a.uri, width: a.width, height: a.height });
  };

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    const a = res.canceled ? null : res.assets[0];
    if (a) scan({ uri: a.uri, width: a.width, height: a.height });
  };

  const info = result ? SHAPE_INFO[result.shape] : null;

  return (
    <View style={s.root}>
      <HaloBackground />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {inOnboarding ? <View style={s.back} /> : (
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
        )}

        {stage === 'start' && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <Text style={s.kicker}>FACE SCAN</Text>
            <Text style={s.title}>Find the shapes{'\n'}that frame you</Text>
            <Text style={s.body}>
              Take a selfie looking straight at the camera, with your hair pulled back off your forehead.
              Your photo stays on your phone.
            </Text>
            <View style={{ gap: Spacing.md, marginTop: Spacing.xxl }}>
              <Button label="Take a selfie" onPress={takeSelfie} />
              <Button label="Choose a photo" variant="ghost" onPress={choosePhoto} />
            </View>
            {inOnboarding && (
              <Pressable onPress={goToQuiz} hitSlop={12} style={{ marginTop: Spacing.xl, alignSelf: 'center' }}>
                <Text style={s.backText}>Skip for now</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {photo && stage !== 'start' && (
          <PhotoWithOverlay photo={photo} result={result} scanning={stage === 'scanning'} />
        )}

        {stage === 'scanning' && <Text style={[s.body, s.center]}>Reading your proportions</Text>}

        {stage === 'result' && result && info && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <Text style={s.kicker}>YOUR FACE SHAPE</Text>
            <Text style={s.title}>{info.name}</Text>
            <Text style={s.body}>{info.line}</Text>

            <Text style={s.section}>Your thirds</Text>
            <ThirdsBar thirds={result.thirds} />

            <Text style={s.section}>Styles to try</Text>
            <View style={s.chips}>
              {info.styles.map(st => (
                <View key={st} style={s.chip}><Text style={s.chipText}>{st}</Text></View>
              ))}
            </View>

            <Text style={s.section}>Colours for you</Text>
            <Text style={s.caption}>Which jewellery looks best on you?</Text>
            <View style={s.chips}>
              {([['warm', 'Gold'], ['cool', 'Silver'], ['neutral', 'Both']] as [Undertone, string][]).map(([u, label]) => (
                <Pressable
                  key={u}
                  onPress={() => setUndertone(u)}
                  style={[s.chip, undertone === u && s.chipActive]}
                >
                  <Text style={[s.chipText, undertone === u && s.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {undertone && (
              <Animated.View entering={FadeIn.duration(300)} style={s.swatches}>
                {COLOURS[undertone].map(c => (
                  <View key={c.name} style={s.swatchItem}>
                    <View style={[s.swatch, { backgroundColor: c.hex }]} />
                    <Text style={s.swatchName}>{c.name}</Text>
                  </View>
                ))}
              </Animated.View>
            )}

            <View style={{ gap: Spacing.md, marginTop: Spacing.xxxl }}>
              {inOnboarding
                ? <Button label="Continue" onPress={goToQuiz} />
                : <Button label="Find a stylist for this" onPress={() => router.push('/(tabs)/discover')} />}
              <Button label="Scan again" variant="ghost" onPress={() => { setStage('start'); setPhoto(null); }} />
            </View>
            <Text style={[s.caption, s.center, { marginTop: Spacing.lg }]}>
              Face shape is a starting point, not a rule. Wear what you love.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Photo with the scan line while scanning, then the outline and measurement lines.
function PhotoWithOverlay({ photo, result, scanning }: { photo: Photo; result: ScanResult | null; scanning: boolean }) {
  const h = PHOTO_W * (photo.height / photo.width);
  const k = PHOTO_W / photo.width; // image pixels -> screen points

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (h - 2) }] }));

  const o = result?.overlay;
  const hLine = (y: number, x1: number, x2: number, colour: string, key: string) => (
    <Line key={key} x1={x1 * k} y1={y * k} x2={x2 * k} y2={y * k} stroke={colour} strokeWidth={1.5} />
  );

  return (
    <View style={[s.photoWrap, { height: h }]}>
      <Image source={{ uri: photo.uri }} style={{ width: PHOTO_W, height: h }} />
      {scanning && <Animated.View style={[s.scanLine, lineStyle]} />}
      {o && (
        <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
          <Svg width={PHOTO_W} height={h}>
            <Polygon
              points={o.outline.map(p => `${p.x * k},${p.y * k}`).join(' ')}
              fill="none" stroke={Colors.lavender} strokeWidth={1.5} strokeDasharray="4 4"
            />
            {/* Thirds: full-width lines across the photo */}
            {[o.topY, o.browY, o.noseY, o.chinY].map((y, i) =>
              hLine(y, 0, photo.width, 'rgba(255,254,247,0.55)', `t${i}`))}
            {/* Widths */}
            {hLine(o.foreheadLine.y, o.foreheadLine.x1, o.foreheadLine.x2, Colors.pink, 'f')}
            {hLine(o.cheekLine.y, o.cheekLine.x1, o.cheekLine.x2, Colors.lime, 'c')}
            {hLine(o.jawLine.y, o.jawLine.x1, o.jawLine.x2, Colors.pink, 'j')}
            {(['1', '2', '3'] as const).map((n, i) => {
              const ys = [o.topY, o.browY, o.noseY, o.chinY];
              return (
                <SvgText key={n} x={10} y={((ys[i] + ys[i + 1]) / 2) * k + 5}
                  fill="#FFFEF7" fontSize={13} fontWeight="600">{n}</SvgText>
              );
            })}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

function ThirdsBar({ thirds }: { thirds: ScanResult['thirds'] }) {
  const parts = [
    { label: 'Forehead', v: thirds.upper, c: Colors.violet },
    { label: 'Mid-face', v: thirds.middle, c: Colors.lavender },
    { label: 'Lower face', v: thirds.lower, c: Colors.pink },
  ];
  return (
    <View>
      <View style={s.bar}>
        {parts.map(p => <View key={p.label} style={{ flex: p.v, backgroundColor: p.c }} />)}
      </View>
      <View style={s.barLabels}>
        {parts.map(p => (
          <View key={p.label} style={{ flex: p.v }}>
            <Text style={s.barValue}>{p.v}%</Text>
            <Text style={s.caption}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Surface.base },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: Spacing.huge },
  back: { marginBottom: Spacing.xxl },
  backText: { fontFamily: 'Sora_500Medium', fontSize: 14, color: Foreground.muted },
  kicker: { fontFamily: 'Sora_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: Colors.lavender, marginBottom: Spacing.sm },
  title: { fontFamily: Fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: Foreground.primary, marginBottom: Spacing.md },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: Foreground.muted },
  caption: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: Foreground.muted },
  center: { textAlign: 'center', marginTop: Spacing.lg },
  section: { fontFamily: Fonts.headingSemi, fontSize: 18, color: Foreground.primary, marginTop: Spacing.xxxl, marginBottom: Spacing.md },
  photoWrap: { width: PHOTO_W, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xxl, borderWidth: 1, borderColor: BorderTone.base },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: Colors.lime, shadowColor: Colors.lime, shadowOpacity: 0.9, shadowRadius: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Surface.raised, borderWidth: 1, borderColor: BorderTone.base },
  chipActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  chipText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: Foreground.primary },
  chipTextActive: { color: '#FFFFFF' },
  swatches: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg },
  swatchItem: { alignItems: 'center', width: (PHOTO_W - Spacing.md * 3) / 4 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: BorderTone.strong, marginBottom: Spacing.xs },
  swatchName: { fontFamily: Fonts.body, fontSize: 11, color: Foreground.muted, textAlign: 'center' },
  bar: { flexDirection: 'row', height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  barLabels: { flexDirection: 'row', marginTop: Spacing.sm },
  barValue: { fontFamily: 'Sora_600SemiBold', fontSize: 15, color: Foreground.primary },
});
