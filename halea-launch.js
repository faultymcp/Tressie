// halea-launch.js
// One-shot launch update for Halea. Run from your project folder:
//     node halea-launch.js
// Safe to run twice: anything already done is skipped.
// Every file it changes or removes is copied to .launch-backup/ first.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP = path.join(ROOT, '.launch-backup', STAMP);
const report = [];
const done = (m) => report.push(['DONE   ', m]);
const skip = (m) => report.push(['ALREADY', m]);
const warn = (m) => report.push(['CHECK  ', m]);

// ─── Files written in full (new or replaced) ───────────────────────
const FILES = {
  "app/face-scan.tsx": "// app/face-scan.tsx\n// Face scan: selfie -> face shape + facial thirds -> styles and colours to try\n// -> find a stylist who can do it.\n// Detection runs on the phone (ML Kit). The photo is never uploaded or saved.\n// Needs a development build (not Expo Go) because of the native face detector.\n//\n// Two ways in:\n//   /face-scan?onboarding=1  first run, between the name screen and the quiz.\n//                           Ends with \"Continue\" into the quiz, and can be skipped.\n//   /face-scan               from Profile, any time. Ends with \"Find a stylist\".\n// The result is kept on the phone under 'halea_face_scan' so other screens can use it.\n\nimport { useEffect, useState } from 'react';\nimport {\n  View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, Platform, Alert,\n} from 'react-native';\nimport { useRouter, useLocalSearchParams } from 'expo-router';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\nimport * as ImagePicker from 'expo-image-picker';\nimport FaceDetection from '@react-native-ml-kit/face-detection';\nimport Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';\nimport Animated, {\n  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,\n} from 'react-native-reanimated';\nimport { Colors, Fonts, Radius, Spacing, Surface, Foreground, BorderTone } from '@/constants/theme';\nimport { HaloBackground } from '@/components/HaloBackground';\nimport Button from '@/components/primitives/Button';\nimport {\n  analyseFace, SHAPE_INFO, COLOURS, type ScanResult, type ScanProblem, type Undertone,\n} from '@/lib/faceScan';\n\nconst { width: SCREEN_W } = Dimensions.get('window');\nconst PHOTO_W = SCREEN_W - Spacing.xl * 2;\nconst MIN_SCAN_MS = 1800; // let the scan line run long enough to feel like something happened\nconst FACE_SCAN_KEY = 'halea_face_scan';\n\ntype Photo = { uri: string; width: number; height: number };\ntype Stage = 'start' | 'scanning' | 'result';\n\nconst PROBLEM_TEXT: Record<ScanProblem, string> = {\n  'no-face': \"We couldn't find a face. Try a brighter spot, facing the camera.\",\n  'no-outline': \"We couldn't read your face outline. Pull your hair back off your face and try again.\",\n  turned: 'Your head is turned a little. Look straight at the camera and try again.',\n};\n\nexport default function FaceScanScreen() {\n  const router = useRouter();\n  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();\n  const inOnboarding = onboarding === '1';\n  const [stage, setStage] = useState<Stage>('start');\n  const [photo, setPhoto] = useState<Photo | null>(null);\n  const [result, setResult] = useState<ScanResult | null>(null);\n  const [undertone, setUndertone] = useState<Undertone | null>(null);\n\n  // Keep the latest result on the phone (shape, thirds, undertone). Never the photo.\n  useEffect(() => {\n    if (!result) return;\n    AsyncStorage.setItem(FACE_SCAN_KEY, JSON.stringify({\n      shape: result.shape,\n      thirds: result.thirds,\n      undertone,\n      scannedAt: new Date().toISOString(),\n    })).catch(() => {});\n  }, [result, undertone]);\n\n  const goToQuiz = () => router.replace('/quiz');\n\n  const scan = async (p: Photo) => {\n    setPhoto(p);\n    setResult(null);\n    setStage('scanning');\n    const started = Date.now();\n    try {\n      const faces = await FaceDetection.detect(p.uri, {\n        performanceMode: 'accurate',\n        contourMode: 'all',\n      });\n      const r = analyseFace(faces);\n      await new Promise(res => setTimeout(res, Math.max(0, MIN_SCAN_MS - (Date.now() - started))));\n      if (typeof r === 'string') {\n        setStage('start');\n        Alert.alert('Let’s try that again', PROBLEM_TEXT[r]);\n        return;\n      }\n      setResult(r);\n      setStage('result');\n    } catch (e) {\n      setStage('start');\n      Alert.alert('Something went wrong', 'The scan could not run. Please try again.');\n    }\n  };\n\n  const takeSelfie = async () => {\n    const { status } = await ImagePicker.requestCameraPermissionsAsync();\n    if (status !== 'granted') {\n      Alert.alert('Camera needed', 'Allow camera access in Settings to scan your face.');\n      return;\n    }\n    const res = await ImagePicker.launchCameraAsync({\n      cameraType: ImagePicker.CameraType.front,\n      allowsEditing: true,\n      aspect: [3, 4],\n      quality: 0.8,\n    });\n    const a = res.canceled ? null : res.assets[0];\n    if (a) scan({ uri: a.uri, width: a.width, height: a.height });\n  };\n\n  const choosePhoto = async () => {\n    const res = await ImagePicker.launchImageLibraryAsync({\n      mediaTypes: ['images'],\n      allowsEditing: true,\n      aspect: [3, 4],\n      quality: 0.8,\n    });\n    const a = res.canceled ? null : res.assets[0];\n    if (a) scan({ uri: a.uri, width: a.width, height: a.height });\n  };\n\n  const info = result ? SHAPE_INFO[result.shape] : null;\n\n  return (\n    <View style={s.root}>\n      <HaloBackground />\n      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>\n        {inOnboarding ? <View style={s.back} /> : (\n          <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>\n            <Text style={s.backText}>Back</Text>\n          </Pressable>\n        )}\n\n        {stage === 'start' && (\n          <Animated.View entering={FadeInUp.duration(500)}>\n            <Text style={s.kicker}>FACE SCAN</Text>\n            <Text style={s.title}>Find the shapes{'\\n'}that frame you</Text>\n            <Text style={s.body}>\n              Take a selfie looking straight at the camera, with your hair pulled back off your forehead.\n              Your photo stays on your phone.\n            </Text>\n            <View style={{ gap: Spacing.md, marginTop: Spacing.xxl }}>\n              <Button label=\"Take a selfie\" onPress={takeSelfie} />\n              <Button label=\"Choose a photo\" variant=\"ghost\" onPress={choosePhoto} />\n            </View>\n            {inOnboarding && (\n              <Pressable onPress={goToQuiz} hitSlop={12} style={{ marginTop: Spacing.xl, alignSelf: 'center' }}>\n                <Text style={s.backText}>Skip for now</Text>\n              </Pressable>\n            )}\n          </Animated.View>\n        )}\n\n        {photo && stage !== 'start' && (\n          <PhotoWithOverlay photo={photo} result={result} scanning={stage === 'scanning'} />\n        )}\n\n        {stage === 'scanning' && <Text style={[s.body, s.center]}>Reading your proportions</Text>}\n\n        {stage === 'result' && result && info && (\n          <Animated.View entering={FadeInUp.duration(500)}>\n            <Text style={s.kicker}>YOUR FACE SHAPE</Text>\n            <Text style={s.title}>{info.name}</Text>\n            <Text style={s.body}>{info.line}</Text>\n\n            <Text style={s.section}>Your thirds</Text>\n            <ThirdsBar thirds={result.thirds} />\n\n            <Text style={s.section}>Styles to try</Text>\n            <View style={s.chips}>\n              {info.styles.map(st => (\n                <View key={st} style={s.chip}><Text style={s.chipText}>{st}</Text></View>\n              ))}\n            </View>\n\n            <Text style={s.section}>Colours for you</Text>\n            <Text style={s.caption}>Which jewellery looks best on you?</Text>\n            <View style={s.chips}>\n              {([['warm', 'Gold'], ['cool', 'Silver'], ['neutral', 'Both']] as [Undertone, string][]).map(([u, label]) => (\n                <Pressable\n                  key={u}\n                  onPress={() => setUndertone(u)}\n                  style={[s.chip, undertone === u && s.chipActive]}\n                >\n                  <Text style={[s.chipText, undertone === u && s.chipTextActive]}>{label}</Text>\n                </Pressable>\n              ))}\n            </View>\n            {undertone && (\n              <Animated.View entering={FadeIn.duration(300)} style={s.swatches}>\n                {COLOURS[undertone].map(c => (\n                  <View key={c.name} style={s.swatchItem}>\n                    <View style={[s.swatch, { backgroundColor: c.hex }]} />\n                    <Text style={s.swatchName}>{c.name}</Text>\n                  </View>\n                ))}\n              </Animated.View>\n            )}\n\n            <View style={{ gap: Spacing.md, marginTop: Spacing.xxxl }}>\n              {inOnboarding\n                ? <Button label=\"Continue\" onPress={goToQuiz} />\n                : <Button label=\"Find a stylist for this\" onPress={() => router.push('/(tabs)/discover')} />}\n              <Button label=\"Scan again\" variant=\"ghost\" onPress={() => { setStage('start'); setPhoto(null); }} />\n            </View>\n            <Text style={[s.caption, s.center, { marginTop: Spacing.lg }]}>\n              Face shape is a starting point, not a rule. Wear what you love.\n            </Text>\n          </Animated.View>\n        )}\n      </ScrollView>\n    </View>\n  );\n}\n\n// Photo with the scan line while scanning, then the outline and measurement lines.\nfunction PhotoWithOverlay({ photo, result, scanning }: { photo: Photo; result: ScanResult | null; scanning: boolean }) {\n  const h = PHOTO_W * (photo.height / photo.width);\n  const k = PHOTO_W / photo.width; // image pixels -> screen points\n\n  const sweep = useSharedValue(0);\n  useEffect(() => {\n    sweep.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);\n  }, []);\n  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * (h - 2) }] }));\n\n  const o = result?.overlay;\n  const hLine = (y: number, x1: number, x2: number, colour: string, key: string) => (\n    <Line key={key} x1={x1 * k} y1={y * k} x2={x2 * k} y2={y * k} stroke={colour} strokeWidth={1.5} />\n  );\n\n  return (\n    <View style={[s.photoWrap, { height: h }]}>\n      <Image source={{ uri: photo.uri }} style={{ width: PHOTO_W, height: h }} />\n      {scanning && <Animated.View style={[s.scanLine, lineStyle]} />}\n      {o && (\n        <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>\n          <Svg width={PHOTO_W} height={h}>\n            <Polygon\n              points={o.outline.map(p => `${p.x * k},${p.y * k}`).join(' ')}\n              fill=\"none\" stroke={Colors.lavender} strokeWidth={1.5} strokeDasharray=\"4 4\"\n            />\n            {/* Thirds: full-width lines across the photo */}\n            {[o.topY, o.browY, o.noseY, o.chinY].map((y, i) =>\n              hLine(y, 0, photo.width, 'rgba(255,254,247,0.55)', `t${i}`))}\n            {/* Widths */}\n            {hLine(o.foreheadLine.y, o.foreheadLine.x1, o.foreheadLine.x2, Colors.pink, 'f')}\n            {hLine(o.cheekLine.y, o.cheekLine.x1, o.cheekLine.x2, Colors.lime, 'c')}\n            {hLine(o.jawLine.y, o.jawLine.x1, o.jawLine.x2, Colors.pink, 'j')}\n            {(['1', '2', '3'] as const).map((n, i) => {\n              const ys = [o.topY, o.browY, o.noseY, o.chinY];\n              return (\n                <SvgText key={n} x={10} y={((ys[i] + ys[i + 1]) / 2) * k + 5}\n                  fill=\"#FFFEF7\" fontSize={13} fontWeight=\"600\">{n}</SvgText>\n              );\n            })}\n          </Svg>\n        </Animated.View>\n      )}\n    </View>\n  );\n}\n\nfunction ThirdsBar({ thirds }: { thirds: ScanResult['thirds'] }) {\n  const parts = [\n    { label: 'Forehead', v: thirds.upper, c: Colors.violet },\n    { label: 'Mid-face', v: thirds.middle, c: Colors.lavender },\n    { label: 'Lower face', v: thirds.lower, c: Colors.pink },\n  ];\n  return (\n    <View>\n      <View style={s.bar}>\n        {parts.map(p => <View key={p.label} style={{ flex: p.v, backgroundColor: p.c }} />)}\n      </View>\n      <View style={s.barLabels}>\n        {parts.map(p => (\n          <View key={p.label} style={{ flex: p.v }}>\n            <Text style={s.barValue}>{p.v}%</Text>\n            <Text style={s.caption}>{p.label}</Text>\n          </View>\n        ))}\n      </View>\n    </View>\n  );\n}\n\nconst s = StyleSheet.create({\n  root: { flex: 1, backgroundColor: Surface.base },\n  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: Spacing.huge },\n  back: { marginBottom: Spacing.xxl },\n  backText: { fontFamily: 'Sora_500Medium', fontSize: 14, color: Foreground.muted },\n  kicker: { fontFamily: 'Sora_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: Colors.lavender, marginBottom: Spacing.sm },\n  title: { fontFamily: Fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: Foreground.primary, marginBottom: Spacing.md },\n  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: Foreground.muted },\n  caption: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: Foreground.muted },\n  center: { textAlign: 'center', marginTop: Spacing.lg },\n  section: { fontFamily: Fonts.headingSemi, fontSize: 18, color: Foreground.primary, marginTop: Spacing.xxxl, marginBottom: Spacing.md },\n  photoWrap: { width: PHOTO_W, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xxl, borderWidth: 1, borderColor: BorderTone.base },\n  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: Colors.lime, shadowColor: Colors.lime, shadowOpacity: 0.9, shadowRadius: 8 },\n  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },\n  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Surface.raised, borderWidth: 1, borderColor: BorderTone.base },\n  chipActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },\n  chipText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: Foreground.primary },\n  chipTextActive: { color: '#FFFFFF' },\n  swatches: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg },\n  swatchItem: { alignItems: 'center', width: (PHOTO_W - Spacing.md * 3) / 4 },\n  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: BorderTone.strong, marginBottom: Spacing.xs },\n  swatchName: { fontFamily: Fonts.body, fontSize: 11, color: Foreground.muted, textAlign: 'center' },\n  bar: { flexDirection: 'row', height: 10, borderRadius: Radius.full, overflow: 'hidden' },\n  barLabels: { flexDirection: 'row', marginTop: Spacing.sm },\n  barValue: { fontFamily: 'Sora_600SemiBold', fontSize: 15, color: Foreground.primary },\n});\n",
  "lib/faceScan.ts": "// lib/faceScan.ts\n// Turns the face outline from on-device face detection into:\n//   - face shape (oval, round, square, heart, diamond, long)\n//   - facial thirds (forehead / mid-face / lower face)\n//   - the lines we draw over the photo\n//\n// Everything runs on the phone. The photo is never uploaded.\n//\n// HONEST LIMITS\n// - The top of the detected outline is roughly the top of the forehead,\n//   not the true hairline. So the upper third is an estimate.\n// - The shape thresholds below are starting values. Test on 10 to 15 real\n//   selfies (different face shapes and skin tones) and tune THRESHOLDS.\n\nimport type { Face, Point } from '@react-native-ml-kit/face-detection';\n\nexport type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'long';\n\nexport type ScanResult = {\n  shape: FaceShape;\n  thirds: { upper: number; middle: number; lower: number }; // percentages, add to 100\n  widths: { forehead: number; cheekbones: number; jaw: number }; // pixels\n  lengthToWidth: number;\n  // Everything needed to draw the overlay, in image pixel coordinates\n  overlay: {\n    outline: Point[];\n    topY: number;\n    browY: number;\n    noseY: number;\n    chinY: number;\n    foreheadLine: { y: number; x1: number; x2: number };\n    cheekLine: { y: number; x1: number; x2: number };\n    jawLine: { y: number; x1: number; x2: number };\n  };\n};\n\nexport type ScanProblem = 'no-face' | 'no-outline' | 'turned';\n\n// All the tuning numbers in one place.\nexport const THRESHOLDS = {\n  long: 1.5,            // length / cheekbone width at or above this = long\n  shortFace: 1.35,      // below this the face counts as short (round or square)\n  squareJaw: 0.9,       // jaw / cheekbones at or above this = strong jaw\n  heartJaw: 0.8,        // jaw / forehead below this, with a wide forehead = heart\n  wideForehead: 0.95,   // forehead / cheekbones at or above this = wide forehead\n  diamondNarrow: 0.85,  // forehead and jaw both below this x cheekbones = diamond\n  maxTurnDegrees: 12,   // head turned more than this = ask for a straight-on photo\n};\n\n// Left and right edge of the outline at height y (horizontal slice through the polygon).\nfunction edgesAtY(outline: Point[], y: number): { x1: number; x2: number } | null {\n  const xs: number[] = [];\n  for (let i = 0; i < outline.length; i++) {\n    const a = outline[i];\n    const b = outline[(i + 1) % outline.length];\n    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {\n      const t = (y - a.y) / (b.y - a.y);\n      xs.push(a.x + t * (b.x - a.x));\n    }\n  }\n  if (xs.length < 2) return null;\n  return { x1: Math.min(...xs), x2: Math.max(...xs) };\n}\n\nconst avgY = (pts: Point[] = []) => pts.reduce((s, p) => s + p.y, 0) / Math.max(pts.length, 1);\nconst maxY = (pts: Point[] = []) => Math.max(...pts.map(p => p.y));\n\nexport function classifyShape(lengthToWidth: number, forehead: number, cheek: number, jaw: number): FaceShape {\n  const T = THRESHOLDS;\n  if (lengthToWidth >= T.long) return 'long';\n  if (forehead < cheek * T.diamondNarrow && jaw < cheek * T.diamondNarrow) return 'diamond';\n  if (forehead >= cheek * T.wideForehead && jaw < forehead * T.heartJaw) return 'heart';\n  if (lengthToWidth < T.shortFace) return jaw >= cheek * T.squareJaw ? 'square' : 'round';\n  return 'oval';\n}\n\n// Main entry: pass the faces returned by FaceDetection.detect(...)\nexport function analyseFace(faces: Face[]): ScanResult | ScanProblem {\n  if (!faces.length) return 'no-face';\n  // Biggest face in the photo is the person scanning\n  const face = [...faces].sort((a, b) => b.frame.width * b.frame.height - a.frame.width * a.frame.height)[0];\n\n  if (Math.abs(face.rotationY) > THRESHOLDS.maxTurnDegrees || Math.abs(face.rotationZ) > THRESHOLDS.maxTurnDegrees) {\n    return 'turned';\n  }\n\n  const c = face.contours;\n  const outline = c?.face?.points;\n  if (!c || !outline || outline.length < 10) return 'no-outline';\n\n  const topY = Math.min(...outline.map(p => p.y));\n  const chinY = Math.max(...outline.map(p => p.y));\n  const browY = (avgY(c.leftEyebrowTop?.points) + avgY(c.rightEyebrowTop?.points)) / 2;\n  const noseY = maxY(c.noseBottom?.points);\n  const length = chinY - topY;\n\n  // Widest point between brows and nose = cheekbones\n  let cheekLine = { y: browY, x1: 0, x2: 0 };\n  for (let i = 0; i <= 10; i++) {\n    const y = browY + ((noseY - browY) * i) / 10;\n    const e = edgesAtY(outline, y);\n    if (e && e.x2 - e.x1 > cheekLine.x2 - cheekLine.x1) cheekLine = { y, ...e };\n  }\n\n  const foreheadY = (topY + browY) / 2;\n  const jawY = noseY + (chinY - noseY) * 0.55;\n  const fe = edgesAtY(outline, foreheadY);\n  const je = edgesAtY(outline, jawY);\n  if (!fe || !je || cheekLine.x2 === 0) return 'no-outline';\n\n  const forehead = fe.x2 - fe.x1;\n  const cheekbones = cheekLine.x2 - cheekLine.x1;\n  const jaw = je.x2 - je.x1;\n  const lengthToWidth = length / cheekbones;\n\n  const upper = browY - topY;\n  const middle = noseY - browY;\n  const lower = chinY - noseY;\n  const total = upper + middle + lower;\n  const pct = (n: number) => Math.round((n / total) * 100);\n  const u = pct(upper);\n  const m = pct(middle);\n\n  return {\n    shape: classifyShape(lengthToWidth, forehead, cheekbones, jaw),\n    thirds: { upper: u, middle: m, lower: 100 - u - m },\n    widths: { forehead, cheekbones, jaw },\n    lengthToWidth,\n    overlay: {\n      outline,\n      topY, browY, noseY, chinY,\n      foreheadLine: { y: foreheadY, ...fe },\n      cheekLine,\n      jawLine: { y: jawY, ...je },\n    },\n  };\n}\n\n// ─── What we show for each result ──────────────────────────────────\n// Styles cover every texture, not just straight and wavy hair.\n\nexport const SHAPE_INFO: Record<FaceShape, { name: string; line: string; styles: string[] }> = {\n  oval: {\n    name: 'Oval',\n    line: 'Balanced proportions. Most cuts work, so go where your mood takes you.',\n    styles: ['Blunt bob', 'Curtain fringe', 'Big defined curls', 'Box braids, any length', 'Sleek high ponytail'],\n  },\n  round: {\n    name: 'Round',\n    line: 'Soft curves and a fuller cheek line. Height and length add shape.',\n    styles: ['Long layers past the chin', 'High puff or pineapple', 'Side-swept fringe', 'Knotless braids worn long', 'Tapered cut with height on top'],\n  },\n  square: {\n    name: 'Square',\n    line: 'A strong jaw and straight lines. Softness around the face works beautifully.',\n    styles: ['Soft face-framing layers', 'Loose curls at the jaw', 'Wispy fringe', 'Twist-out with volume', 'Side part with movement'],\n  },\n  heart: {\n    name: 'Heart',\n    line: 'A wider forehead tapering to a delicate chin. Volume lower down balances it.',\n    styles: ['Chin-length bob', 'Side-swept fringe', 'Curls that fill out at the jaw', 'Low bun with face-framing pieces', 'Shoulder-length locs'],\n  },\n  diamond: {\n    name: 'Diamond',\n    line: 'Cheekbones are your feature. Width at the forehead and chin shows them off.',\n    styles: ['Full fringe', 'Chin-length curls', 'Tucked-behind-ear bob', 'Afro with even volume', 'Half-up braids'],\n  },\n  long: {\n    name: 'Long',\n    line: 'Length with elegance. Width at the sides keeps things in proportion.',\n    styles: ['Full fringe', 'Shoulder-length waves', 'Wide twist-out', 'Layered lob', 'Braids with volume at the sides'],\n  },\n};\n\nexport type Undertone = 'warm' | 'cool' | 'neutral';\n\n// The person picks their undertone. We don't guess skin tone from the photo:\n// room lighting makes that unreliable, and it goes wrong most on darker skin.\nexport const COLOURS: Record<Undertone, { name: string; hex: string }[]> = {\n  warm: [\n    { name: 'Honey', hex: '#C68E3F' },\n    { name: 'Copper', hex: '#B5562C' },\n    { name: 'Caramel', hex: '#A0672F' },\n    { name: 'Golden brown', hex: '#7A4A22' },\n  ],\n  cool: [\n    { name: 'Ash brown', hex: '#6B5B4E' },\n    { name: 'Burgundy', hex: '#6D1A2C' },\n    { name: 'Plum', hex: '#4E2547' },\n    { name: 'Blue black', hex: '#14161F' },\n  ],\n  neutral: [\n    { name: 'Chestnut', hex: '#6E3B23' },\n    { name: 'Soft auburn', hex: '#8A3E26' },\n    { name: 'Mocha', hex: '#4F3326' },\n    { name: 'Bronde', hex: '#9A7650' },\n  ],\n};\n",
  "lib/deviceId.ts": "// lib/deviceId.ts\n// One ID per phone, so free limits (like 3 try-ons a day) count per phone,\n// not per account. Signing in with another email doesn't reset it.\n// iPhone: Apple's per-app device ID (resets only if the app is deleted and reinstalled).\n// Android: the device's app ID (survives reinstalls).\n\nimport { Platform } from 'react-native';\nimport * as Application from 'expo-application';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\n\nconst FALLBACK_KEY = 'halea_device_id';\n\nexport async function getDeviceId(): Promise<string> {\n  try {\n    const id = Platform.OS === 'ios'\n      ? await Application.getIosIdForVendorAsync()\n      : Application.getAndroidId();\n    if (id) return `${Platform.OS}:${id}`;\n  } catch {}\n\n  // Fallback (simulator, web): a random ID kept on the phone\n  let saved = await AsyncStorage.getItem(FALLBACK_KEY).catch(() => null);\n  if (!saved) {\n    saved = `gen:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;\n    await AsyncStorage.setItem(FALLBACK_KEY, saved).catch(() => {});\n  }\n  return saved;\n}\n",
  "supabase/functions/ai-tryon/index.ts": "// supabase/functions/ai-tryon/index.ts\n// Hair try-on: selfie + reference photo -> Replicate (Nano Banana Pro) -> image URL.\n// Free for everyone, with three limits so the bill can't run away:\n//   1. PER_PHONE_PER_DAY   try-ons per phone per day (switching accounts doesn't reset it)\n//   2. PER_ACCOUNT_PER_DAY try-ons per account per day (same account on two phones)\n//   3. APP_DAILY_CAP       try-ons for the whole app per day. Your worst-case daily spend.\n// Days reset at midnight UTC. Change the numbers and redeploy; no app update needed.\n//\n// Deploy: npx supabase functions deploy ai-tryon\n// Needs:  npx supabase secrets set REPLICATE_API_TOKEN=...\n\nimport { createClient } from 'https://esm.sh/@supabase/supabase-js@2';\n\nconst PER_PHONE_PER_DAY = 3;\nconst PER_ACCOUNT_PER_DAY = 3;\nconst APP_DAILY_CAP = 300;     // about $40 a day at 2K\nconst RESOLUTION = '2K';       // 4K costs about twice as much and looks the same on a phone\n\nconst PROMPT = `Transfer the exact hairstyle from the second image onto the person in the first image.\nMatch the colour, texture, length, volume and parting of the hair.\nKeep the person's face, skin tone, expression, clothing, pose, lighting and background unchanged.\nPhotorealistic and natural.`;\n\nconst CORS = {\n  'Access-Control-Allow-Origin': '*',\n  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',\n};\n\n// Every error the app can show goes through here, with a message written for users.\nconst reply = (body: Record<string, unknown>, status = 200) =>\n  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });\nconst fail = (status: number, code: string, error: string) => reply({ code, error }, status);\n\nDeno.serve(async (req) => {\n  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });\n\n  try {\n    const token = Deno.env.get('REPLICATE_API_TOKEN');\n    if (!token) {\n      console.error('REPLICATE_API_TOKEN is not set');\n      return fail(500, 'not-configured', 'Try-on is not available right now. Please try again later.');\n    }\n\n    const supabase = createClient(\n      Deno.env.get('SUPABASE_URL')!,\n      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,\n    );\n\n    // Who is asking\n    const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');\n    const { data: { user } } = await supabase.auth.getUser(jwt);\n    if (!user) return fail(401, 'signed-out', 'Please sign in to use try-on.');\n\n    const { selfie_base64, reference_base64, device_id } = await req.json().catch(() => ({}));\n    if (!selfie_base64 || !reference_base64) {\n      return fail(400, 'missing-photos', 'Add a selfie and a photo of the style you want.');\n    }\n    if (!device_id || typeof device_id !== 'string') {\n      return fail(400, 'old-app', 'Please update Halea to use try-on.');\n    }\n\n    // Limits\n    const startOfDay = new Date();\n    startOfDay.setUTCHours(0, 0, 0, 0);\n    const since = startOfDay.toISOString();\n    const countToday = async (column?: 'user_id' | 'device_id', value?: string) => {\n      let q = supabase.from('tryon_history').select('id', { count: 'exact', head: true }).gte('created_at', since);\n      if (column && value) q = q.eq(column, value);\n      const { count, error } = await q;\n      if (error) throw new Error(`count failed: ${error.message}`);\n      return count ?? 0;\n    };\n\n    const [appToday, phoneToday, accountToday] = await Promise.all([\n      countToday(),\n      countToday('device_id', device_id),\n      countToday('user_id', user.id),\n    ]);\n\n    if (appToday >= APP_DAILY_CAP) {\n      return fail(429, 'paused', 'Try-on is resting for today. It will be back tomorrow.');\n    }\n    if (phoneToday >= PER_PHONE_PER_DAY || accountToday >= PER_ACCOUNT_PER_DAY) {\n      return fail(429, 'daily-limit', `You've used your ${PER_PHONE_PER_DAY} free try-ons for today. Come back tomorrow for more.`);\n    }\n\n    // Run the try-on. \"Prefer: wait\" holds the request until the image is ready (up to 60s).\n    const createRes = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {\n      method: 'POST',\n      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait' },\n      body: JSON.stringify({\n        input: {\n          prompt: PROMPT,\n          image_input: [\n            `data:image/jpeg;base64,${selfie_base64}`,\n            `data:image/jpeg;base64,${reference_base64}`,\n          ],\n          resolution: RESOLUTION,\n          aspect_ratio: 'match_input_image',\n          output_format: 'png',\n        },\n      }),\n    });\n\n    let prediction = await createRes.json();\n    if (!createRes.ok) {\n      console.error('Replicate create failed', createRes.status, JSON.stringify(prediction));\n      if (createRes.status === 429) return fail(429, 'busy', 'Try-on is busy. Please try again in a minute.');\n      return fail(502, 'upstream', 'The try-on could not run. Please try again.');\n    }\n\n    // If it isn't finished yet, poll for up to another 60 seconds\n    for (let i = 0; i < 60 && !['succeeded', 'failed', 'canceled'].includes(prediction.status); i++) {\n      await new Promise((r) => setTimeout(r, 1000));\n      const res = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${token}` } });\n      prediction = await res.json();\n    }\n\n    if (prediction.status !== 'succeeded') {\n      console.error('Replicate did not succeed', prediction.status, prediction.error);\n      return fail(502, 'failed', 'The try-on did not work this time. Try a clearer, front-facing selfie.');\n    }\n\n    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;\n\n    // Only successful try-ons count towards the limits\n    const { error: insertErr } = await supabase.from('tryon_history').insert({\n      user_id: user.id,\n      device_id,\n      resolution: RESOLUTION.toLowerCase(),\n      source: 'replicate',\n      output_url: outputUrl,\n      model_version: 'nano-banana-pro',\n    });\n    if (insertErr) console.error('tryon_history insert failed', insertErr.message);\n\n    return reply({\n      success: true,\n      output_url: outputUrl,\n      remaining_today: Math.max(0, PER_PHONE_PER_DAY - phoneToday - 1),\n    });\n  } catch (err) {\n    console.error('ai-tryon error', err);\n    return fail(500, 'error', 'Something went wrong. Please try again.');\n  }\n});\n",
  "supabase/sql/2026-10-10_tryon_limits.sql": "-- Free try-on limits: run once in Supabase > SQL Editor > New query > Run.\n-- Safe to run more than once.\n\n-- Make sure the try-on log has what the limits need\nalter table public.tryon_history add column if not exists device_id text;\nalter table public.tryon_history add column if not exists created_at timestamptz not null default now();\n\n-- Fast counting for \"how many today\" checks\ncreate index if not exists tryon_history_created_at_idx on public.tryon_history (created_at);\ncreate index if not exists tryon_history_device_day_idx on public.tryon_history (device_id, created_at);\ncreate index if not exists tryon_history_user_day_idx   on public.tryon_history (user_id, created_at);\n\n-- Handy check while testing: today's try-ons per phone\n-- select device_id, count(*) from public.tryon_history\n-- where created_at >= date_trunc('day', now() at time zone 'utc')\n-- group by device_id order by 2 desc;\n\n-- Account deletion keeps a phone's daily try-on count but removes the person from it\nalter table public.tryon_history alter column user_id drop not null;\n",
  "eas.json": "{\n  \"cli\": {\n    \"version\": \">= 16.0.0\",\n    \"appVersionSource\": \"remote\"\n  },\n  \"build\": {\n    \"development\": {\n      \"developmentClient\": true,\n      \"distribution\": \"internal\",\n      \"android\": { \"buildType\": \"apk\" }\n    },\n    \"preview\": {\n      \"distribution\": \"internal\",\n      \"android\": { \"buildType\": \"apk\" }\n    },\n    \"production\": {\n      \"autoIncrement\": true\n    }\n  },\n  \"submit\": {\n    \"production\": {}\n  }\n}\n",
  "lib/deleteAccount.ts": "// lib/deleteAccount.ts\n// Calls the delete-account server function. Returns true when the account is gone.\n\nimport { supabase } from '@/lib/supabase';\n\nexport async function deleteMyAccount(): Promise<boolean> {\n  try {\n    const { data: { session } } = await supabase.auth.getSession();\n    if (!session) return false;\n    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {\n      method: 'POST',\n      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },\n    });\n    return res.ok;\n  } catch {\n    return false;\n  }\n}\n"
};
const DELETE_FN = "// supabase/functions/delete-account/index.ts\n// Really deletes the signed-in user's account and data (Apple requires this).\n// Deploy: npx supabase functions deploy delete-account\n\nimport { createClient } from 'https://esm.sh/@supabase/supabase-js@2';\n\nconst CORS = {\n  'Access-Control-Allow-Origin': '*',\n  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',\n};\nconst reply = (body: Record<string, unknown>, status = 200) =>\n  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });\n\n// Tables holding the user's own rows (column user_id). Missing tables are skipped.\nconst USER_TABLES = [\n  'user_routine_steps', 'routine_completions', 'user_routines', 'user_hair_profiles',\n  'favourites', 'bookings', 'xp_ledger', 'xp_balances', 'wallet_transactions',\n  'wallet_balances', 'user_subscriptions', 'discount_codes', 'referrals',\n];\n\nDeno.serve(async (req) => {\n  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });\n\n  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);\n  const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');\n  const { data: { user } } = await admin.auth.getUser(jwt);\n  if (!user) return reply({ error: 'Please sign in again, then delete your account.' }, 401);\n\n  for (const table of USER_TABLES) {\n    const { error } = await admin.from(table).delete().eq('user_id', user.id);\n    if (error) console.log(`skip ${table}: ${error.message}`);\n  }\n\n  // Try-on log: keep the phone's daily count (so deleting an account can't reset\n  // free try-ons) but drop anything that points at the person.\n  const { error: tryonErr } = await admin.from('tryon_history')\n    .update({ user_id: null, output_url: null }).eq('user_id', user.id);\n  if (tryonErr) await admin.from('tryon_history').delete().eq('user_id', user.id);\n\n  await admin.from('profiles').delete().eq('id', user.id);\n\n  const { error } = await admin.auth.admin.deleteUser(user.id);\n  if (error) {\n    console.error('deleteUser failed', error.message);\n    return reply({ error: 'We could not delete your account. Email support@lumaraelabs.com and we will do it for you.' }, 500);\n  }\n  return reply({ success: true });\n});\n";

// ─── Helpers ───────────────────────────────────────────────────────
const abs = (p) => path.join(ROOT, p);
const exists = (p) => fs.existsSync(abs(p));

function backup(p) {
  if (!exists(p)) return;
  const to = path.join(BACKUP, p);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(abs(p), to);
}

// Read with Windows line endings normalised, write back the way it was
function read(p) {
  const raw = fs.readFileSync(abs(p), 'utf8');
  return { text: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') };
}
function write(p, text, crlf) {
  fs.mkdirSync(path.dirname(abs(p)), { recursive: true });
  fs.writeFileSync(abs(p), crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
}

// edit(file, label, [{ find, replace, doneIf }...])
// find: string or RegExp. doneIf: string/RegExp meaning "already applied".
function edit(file, label, steps) {
  if (!exists(file)) return warn(`${label}: ${file} not found. Skipped.`);
  const { text, crlf } = read(file);
  let out = text;
  let changed = 0, already = 0, missing = 0;
  for (const st of steps) {
    const isDone = st.doneIf && (typeof st.doneIf === 'string' ? out.includes(st.doneIf) : st.doneIf.test(out));
    if (isDone) { already++; continue; }
    const hit = typeof st.find === 'string' ? out.includes(st.find) : st.find.test(out);
    if (!hit) { missing++; continue; }
    out = typeof st.find === 'string' ? out.split(st.find).join(st.replace) : out.replace(st.find, st.replace);
    changed++;
  }
  if (changed) { backup(file); write(file, out, crlf); }
  if (missing) warn(`${label}: ${missing} change(s) didn't match your version of ${file}. Send me that file.`);
  else if (changed) done(label);
  else if (already) skip(label);
}

// ─── Sanity check ──────────────────────────────────────────────────
if (!exists('package.json') || !exists('app')) {
  console.error('\nRun this from your Halea project folder (the one with package.json and the app folder).\n');
  process.exit(1);
}

// ─── 1. New and replaced files ─────────────────────────────────────
for (const [p, content] of Object.entries(FILES)) {
  if (exists(p) && read(p).text === content) { skip(`File ${p}`); continue; }
  const existed = exists(p);
  backup(p);
  write(p, content, false);
  done(`${existed ? 'Replaced' : 'Added'} ${p}`);
}

// ─── 2. Remove the old client-side try-on (it read a Replicate key from the app) ──
if (exists('lib/hairTransfer.ts')) {
  backup('lib/hairTransfer.ts');
  fs.unlinkSync(abs('lib/hairTransfer.ts'));
  done('Removed lib/hairTransfer.ts (old try-on that put the Replicate key in the app)');
} else skip('lib/hairTransfer.ts already removed');

if (exists('.env')) {
  const { text, crlf } = read('.env');
  if (/^EXPO_PUBLIC_REPLICATE_TOKEN=.*$/m.test(text)) {
    backup('.env');
    write('.env', text.replace(/^EXPO_PUBLIC_REPLICATE_TOKEN=.*\n?/m, ''), crlf);
    done('Removed EXPO_PUBLIC_REPLICATE_TOKEN from .env (the server has its own copy)');
  }
}

// ─── 3. Onboarding: name screen -> face scan -> quiz ───────────────
edit('app/name.tsx', 'Onboarding goes to the face scan before the quiz', [
  { find: "router.replace('/quiz');", replace: "router.replace('/face-scan?onboarding=1');", doneIf: 'face-scan?onboarding=1' },
]);

edit('app/quiz.tsx', 'Quiz trimmed (wash day moves out of onboarding)', [
  {
    find: /(const KEEP_STEPS = new Set\(\[[^\]]*?)'wash_frequency',\s*/,
    replace: '$1',
    doneIf: /const KEEP_STEPS = new Set\(\[(?![^\]]*wash_frequency)[^\]]*\]\)/,
  },
  { find: "'halea_quiz_progress_v2'", replace: "'halea_quiz_progress_v3'", doneIf: "'halea_quiz_progress_v3'" },
]);

// ─── 4. Remove subscription and wallet from Profile (Apple rejects Stripe for digital features) ──
edit('app/(tabs)/profile.tsx', 'Profile: wallet and subscription removed, face scan added', [
  {
    find: /\n[ \t]*<Pressable onPress=\{\(\) => router\.push\('\/wallet'\)\} style=\{st\.statCard\}>[\s\S]*?<\/Pressable>\n[ \t]*<View style=\{st\.statDivider\} \/>/,
    replace: '',
    doneIf: /^(?![\s\S]*router\.push\('\/wallet'\)\} style=\{st\.statCard\})/,
  },
  {
    find: /\n[ \t]*<MenuRow [^\n]*router\.push\('\/wallet'\)[^\n]*/,
    replace: '',
    doneIf: /^(?![\s\S]*<MenuRow [^\n]*router\.push\('\/wallet'\))/,
  },
  {
    find: /<MenuRow [^\n]*router\.push\('\/subscription'\)[^\n]*\/>/,
    replace: `<MenuRow icon={<IC.Star />} label="Face scan" sublabel="Your face shape and styles to try" onPress={() => router.push('/face-scan')} />`,
    doneIf: "router.push('/face-scan')",
  },
  {
    find: /\n[ \t]*<View style=\{st\.tierBadge\}><Text style=\{st\.tierText\}>\{tierLabel\}<\/Text><\/View>/,
    replace: '',
    doneIf: /^(?![\s\S]*<View style=\{st\.tierBadge\}>)/,
  },
]);

// ─── 5. Try-on screen: free daily limit, no credits or wallet ─────
edit('app/hairtransfer.tsx', 'Try-on screen: free daily limit instead of credits', [
  {
    find: /\n([ \t]*)\/\/ Check try-on credits\n[ \t]*try \{[\s\S]*?console\.log\('Credit check failed, proceeding:', e\);\n[ \t]*\}\n/,
    replace: `\n$1// Free daily limits are checked on the server (supabase/functions/ai-tryon)\n`,
    doneIf: 'Free daily limits are checked on the server',
  },
  {
    find: "import { supabase } from '@/lib/supabase';",
    replace: "import { supabase } from '@/lib/supabase';\nimport { getDeviceId } from '@/lib/deviceId';",
    doneIf: "from '@/lib/deviceId'",
  },
  { find: "resolution: '4k',", replace: 'device_id: await getDeviceId(),', doneIf: 'device_id: await getDeviceId()' },
  { find: 'Uses 1 try-on credit · 4K resolution', replace: '3 free try-ons a day', doneIf: '3 free try-ons a day' },
  {
    find: "Alert.alert('Generation Failed', err.message || 'Something went wrong. Your credit has been restored. Please try again.');",
    replace: "Alert.alert('Try-on', err.message || 'Something went wrong. Please try again.');",
    doneIf: "Alert.alert('Try-on', err.message",
  },
]);

// ─── 6. Help page: no subscription, real contact details ──────────
edit('app/help.tsx', 'Help page: subscription answers removed, contact details fixed', [
  {
    find: /\{ q: 'What is the AI Hair Try-On\?', a: '[^\n]*?' \},/,
    replace: "{ q: 'What is the AI Hair Try-On?', a: 'Upload a selfie and a photo of any hairstyle to see how it could look on you. Everyone gets 3 free try-ons a day.' },",
    doneIf: 'Everyone gets 3 free try-ons a day',
  },
  {
    find: /\n[ \t]*\{ q: 'How do I cancel my subscription\?'[^\n]*/,
    replace: '',
    doneIf: /^(?![\s\S]*How do I cancel my subscription)/,
  },
  { find: 'for appointment discounts and try-on credits.', replace: 'for appointment discounts.', doneIf: /^(?![\s\S]*try-on credits)/ },
  { find: 'mailto:hello@halea.app', replace: 'mailto:support@lumaraelabs.com', doneIf: 'mailto:support@lumaraelabs.com' },
  { find: '>hello@halea.app<', replace: '>support@lumaraelabs.com<', doneIf: '>support@lumaraelabs.com<' },
  { find: "Linking.openURL('https://halea.app')", replace: "Linking.openURL('https://lumaraelabs.com')", doneIf: "Linking.openURL('https://lumaraelabs.com')" },
  { find: '>halea.app<', replace: '>lumaraelabs.com<', doneIf: '>lumaraelabs.com<' },
]);

// ─── 7. Terms and privacy links point at a domain you own ─────────
edit('app/name-capture.tsx', 'Terms and privacy links moved to lumaraelabs.com', [
  { find: "'https://halea.app/terms'", replace: "'https://lumaraelabs.com/terms'", doneIf: "'https://lumaraelabs.com/terms'" },
  { find: "'https://halea.app/privacy'", replace: "'https://lumaraelabs.com/privacy'", doneIf: "'https://lumaraelabs.com/privacy'" },
]);

// ─── 8. Chat: show the real error while testing (users never see it) ──
edit('app/(tabs)/ai-chat.tsx', 'Chat shows the real error in test builds', [
  {
    find: /\n([ \t]*)if \(!response\.ok\) throw new Error\('I had trouble with that one\. Try again\?'\);/,
    replace: [
      '',
      '$1if (!response.ok) {',
      '$1  // In test builds, show the real reason so the chat can be fixed. Users never see this.',
      '$1  if (__DEV__) {',
      "$1    const detail = await response.text().catch(() => '');",
      "$1    throw new Error(`Chat error ${response.status}: ${detail || 'no details'}`);",
      '$1  }',
      "$1  throw new Error('I had trouble with that one. Try again?');",
      '$1}',
    ].join('\n'),
    doneIf: 'Chat error ${response.status}',
  },
]);

// ─── 9. app.json: permission wording, dark system UI, export question ──
if (exists('app.json')) {
  const { text } = read('app.json');
  const cfg = JSON.parse(text);
  const e = cfg.expo || (cfg.expo = {});
  let changed = false;

  const picker = ['expo-image-picker', {
    cameraPermission: 'Halea uses your camera so you can take a selfie for your face scan and to try on hairstyles. Your face scan photo stays on your phone.',
    photosPermission: 'Halea uses your photos so you can choose a picture for your face scan and to try on hairstyles.',
    microphonePermission: false,
  }];
  e.plugins = e.plugins || [];
  const i = e.plugins.findIndex((p) => p === 'expo-image-picker' || (Array.isArray(p) && p[0] === 'expo-image-picker'));
  if (i === -1) { e.plugins.push(picker); changed = true; }
  else if (!Array.isArray(e.plugins[i]) || !e.plugins[i][1] || !e.plugins[i][1].cameraPermission) { e.plugins[i] = picker; changed = true; }

  if (e.userInterfaceStyle !== 'dark') { e.userInterfaceStyle = 'dark'; changed = true; }

  e.ios = e.ios || {};
  e.ios.config = e.ios.config || {};
  if (e.ios.config.usesNonExemptEncryption !== false) { e.ios.config.usesNonExemptEncryption = false; changed = true; }

  if (changed) { backup('app.json'); write('app.json', JSON.stringify(cfg, null, 2) + '\n', false); done('app.json: camera/photo wording, dark system UI, encryption answer'); }
  else skip('app.json settings');
}

// ─── 10. Keep backups out of git ───────────────────────────────────
{
  const gi = exists('.gitignore') ? read('.gitignore') : { text: '', crlf: false };
  if (!gi.text.includes('.launch-backup')) {
    write('.gitignore', gi.text.replace(/\n?$/, '\n') + '.launch-backup/\n', gi.crlf);
    done('.gitignore: backups folder ignored');
  }
}

// ─── 11. Real account deletion (Apple requires it) ────────────────
const fnDir = abs('supabase/functions');
const hasDelete = fs.existsSync(fnDir) && fs.readdirSync(fnDir).some((d) => {
  const f = path.join(fnDir, d, 'index.ts');
  return fs.existsSync(f) && /deleteUser/.test(fs.readFileSync(f, 'utf8'));
});
if (hasDelete) {
  skip('Account deletion function already in your project');
} else {
  write('supabase/functions/delete-account/index.ts', DELETE_FN, false);
  done('Added supabase/functions/delete-account (really deletes the account)');
}

const CALL_DELETE = (indent) => [
  `${indent}const deleted = await deleteMyAccount();`,
  `${indent}if (!deleted) {`,
  `${indent}  Alert.alert('Could not delete account', 'Please try again, or email support@lumaraelabs.com and we will delete it for you.');`,
  `${indent}  return;`,
  `${indent}}`,
  `${indent}await supabase.auth.signOut();`,
].join('\n');

edit('app/settings.tsx', 'Settings: delete account really deletes', [
  {
    find: /\n([ \t]*)\/\/ In production, call an Edge Function that handles cascade deletion\n[ \t]*await supabase\.auth\.signOut\(\);/,
    replace: (_m, ind) => '\n' + CALL_DELETE(ind),
    doneIf: /^(?![\s\S]*In production, call an Edge Function that handles cascade deletion)/,
  },
  {
    find: "import { supabase } from '@/lib/supabase';",
    replace: "import { supabase } from '@/lib/supabase';\nimport { deleteMyAccount } from '@/lib/deleteAccount';",
    doneIf: /^(?![\s\S]*await deleteMyAccount\(\))|from '@\/lib\/deleteAccount'/,
  },
]);

edit('app/privacy.tsx', 'Privacy page: delete account really deletes', [
  {
    find: /(text: 'Delete My Account', style: 'destructive', onPress: async \(\) => \{\n)([ \t]*)await supabase\.auth\.signOut\(\);/,
    replace: (_m, head, ind) => head + CALL_DELETE(ind),
    doneIf: 'deleteMyAccount()',
  },
  {
    find: "import { supabase } from '@/lib/supabase';",
    replace: "import { supabase } from '@/lib/supabase';\nimport { deleteMyAccount } from '@/lib/deleteAccount';",
    doneIf: /^(?![\s\S]*await deleteMyAccount\(\))|from '@\/lib\/deleteAccount'/,
  },
]);

if (exists('app/referral.tsx') && read('app/referral.tsx').text.includes('halea.app/invite')) {
  warn('Referral share link points at halea.app, which you do not own yet. Fine to leave, but the link will not open.');
}

// ─── Report ────────────────────────────────────────────────────────
console.log('\nHalea launch update\n');
for (const [tag, msg] of report) console.log(`  ${tag}  ${msg}`);
if (fs.existsSync(BACKUP)) console.log(`\nBackups of everything changed: ${path.relative(ROOT, BACKUP)}`);
console.log('\nNext: npx expo install expo-application expo-dev-client @react-native-ml-kit/face-detection\n');
