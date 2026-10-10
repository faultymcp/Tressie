// app/reveal.tsx
//
// The reveal. Magazine-cover energy. Seven cards, swipe or tap to advance.
// Deep violet/black base with pink + gold accents.
//
// Architecture:
//   - Data generation (buildRecognition, buildInsight, etc.) is kept from
//     the previous version. It works.
//   - Rendering is replaced: a horizontal pager with 7 cards, gesture-
//     driven, with progress dots and fade-in animations.
//
// Card sequence:
//   1. We made this for you (anticipation opener)
//   2. The Cover (magazine-style name + type)
//   3. What we know about you (facts reflected back)
//   4. The insight (one bold thing they didn't know)
//   5. What your hair does well (validation/strengths)
//   6. Your routine, in brief (teaser, not the full list)
//   7. Your hair is complex. That's the point. (validation closer + CTA)

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect, LinearGradient as LinearGradientSvg } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { HaloBackground } from '@/components/HaloBackground';
import { HaloButton } from '@/components/HaloButton';
import { Colors, Fonts } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// Data generation — unchanged from previous reveal.
// Keeping all the type-aware logic for recognition, insight,
// strengths, watch-outs, and routine building.
// ═══════════════════════════════════════════════════════════════

const TYPE_NAMES: Record<string, string> = {
  '1A': 'Pin straight', '1B': 'Straight with body', '1C': 'Straight and thick',
  '2A': 'Loose waves',  '2B': 'Defined waves',     '2C': 'Deep waves',
  '3A': 'Loose curls',  '3B': 'Springy ringlets',  '3C': 'Tight corkscrews',
  '4A': 'Soft coils',   '4B': 'Z-pattern coils',   '4C': 'Tight coils',
};

const TYPE_TAGLINE: Record<string, string> = {
  '1A': 'The smooth, the simple, the sleek.',
  '1B': 'Straight with quiet body.',
  '1C': 'Straight with weight and shine.',
  '2A': 'Waves that come and go.',
  '2B': 'Waves that stay.',
  '2C': 'Almost curls. Fully waves.',
  '3A': 'Spirals with a gentle hand.',
  '3B': 'Springy. Bouncy. Defined.',
  '3C': 'Corkscrews, packed and proud.',
  '4A': 'Coils that hold their shape.',
  '4B': 'Sharp angles. Strong character.',
  '4C': 'Tight, dense, deeply textured.',
};

const STRAND_LABEL: Record<string, string> = {
  fine: 'fine strands', medium: 'medium strands', coarse: 'coarse strands', unsure: 'unmeasured',
};
const DENSITY_LABEL: Record<string, string> = {
  low: 'low density', medium: 'medium density', high: 'high density', unsure: 'unmeasured',
};
const POROSITY_LABEL: Record<string, string> = {
  low: 'low porosity', medium: 'medium porosity', high: 'high porosity', unsure: 'unmeasured',
};
const WASH_LABEL: Record<string, string> = {
  daily: 'wash daily', few_days: 'wash every 2–3 days', weekly: 'wash weekly', co_wash: 'co-wash only',
};
const TIME_LABEL: Record<string, string> = {
  minimal: 'under 10 minutes a morning', short: '10 to 20 minutes a morning',
  medium: '20 to 40 minutes a morning', generous: '40+ minutes when it wants them',
};
const GOAL_LABEL: Record<string, string> = {
  moisture: 'more moisture', growth: 'length retention', definition: 'curl definition',
  frizz: 'frizz control', scalp_goal: 'scalp health', damage: 'damage repair',
  volume: 'more volume', shine: 'more shine',
};
const HISTORY_LABEL: Record<string, string> = {
  colour: 'colour-treated', relaxer: 'chemically relaxed', heat: 'regularly heat-styled',
  protective: 'often in protective styles', natural: 'fully natural', transitioning: 'currently transitioning',
};
const SEGMENT_LABEL: Record<string, string> = {
  natural: 'fully natural', braids: 'in braids', sewn_in: 'wearing a sewn-in', wig: 'wearing a wig',
  transplant: 'post-transplant', alopecia: 'with alopecia', chemo: 'going through chemo',
  postpartum: 'postpartum', transitioning: 'transitioning',
};

function buildOneInsight(data: any): { title: string; body: string } {
  const type = data.hairType || '3A';
  const group = type.charAt(0);
  const strand = data.strand_thickness;
  const porosity = data.porosity;
  const density = data.density;
  const segments = (data.segments || []) as string[];

  if (density === 'low' && (segments.includes('postpartum') || segments.includes('transplant') || segments.includes('chemo'))) {
    return {
      title: 'Your density is in a chapter, not a verdict.',
      body: 'Postpartum, transplant, and chemo recovery all run on their own timelines. Most regrowth shows real progress at the four-to-six-month mark. The hairs you have now are the scaffolding: we protect them.',
    };
  }
  if (porosity === 'low') {
    return {
      title: 'Low porosity changes the order of everything.',
      body: 'Your cuticles lie tight against the strand. Water beads on top instead of soaking in. Most product advice was written for medium porosity. For you: apply to damp not soaking hair, use warmth, skip the thick butters.',
    };
  }
  if (porosity === 'high') {
    return {
      title: 'High porosity needs sealing, not just moisture.',
      body: 'Your hair drinks fast and dries fast. Adding more moisture without sealing it is why your hair feels dry an hour after conditioning. Layer: water first, oil to seal, cream to lock. Three layers, in that order.',
    };
  }
  if (strand === 'fine' && ['3', '4'].includes(group)) {
    return {
      title: 'Fine strands with strong pattern.',
      body: 'Your hair has a real curl, but each strand is light. Heavy creams will weigh the pattern down. Reach for water-based leave-ins and lightweight gels. Your pattern comes out stronger with less product, not more.',
    };
  }
  if (strand === 'coarse' && ['3', '4'].includes(group)) {
    return {
      title: 'Coarse strands carry weight beautifully.',
      body: 'Butters, heavier creams, oil-based sealants: your strands handle them. Your hair is built to hold the products that would suffocate finer hair. Use that.',
    };
  }
  return {
    title: 'Your structure shapes your routine.',
    body: 'Pattern, density, and porosity together decide what your hair needs more than any single factor. Your routine is built from all three together.',
  };
}

function buildStrengths(type: string, strand: string, porosity: string): string[] {
  const group = type.charAt(0);
  const base: Record<string, string[]> = {
    '1': ['Length retention is naturally high. Ends stay protected.', 'Products spread easily without resistance.'],
    '2': ['Holds styling with very little product.', 'Bounces back after sleep with a quick refresh.'],
    '3': ['Pattern is defined and visible. Products work with it, not against it.', 'Shrinks less than coilier patterns; length shows even when dry.'],
    '4': ['Holds protective styles longer than any other type.', 'Versatile. Stretches, defines, picks out without chemical help.'],
  };
  const out = [...(base[group] || base['3'])];
  if (strand === 'coarse') out.push('Coarse strands are structurally strong. They take colour and heat better than finer hair.');
  else if (strand === 'fine') out.push('Fine strands move and shine in a way coarser hair cannot.');
  if (porosity === 'medium') out.push('Medium porosity is the most flexible. Most products work without much fuss.');
  return out.slice(0, 3);
}

function buildReadback(data: any): string[] {
  const lines: string[] = [];
  const history = (data.history || []) as string[];
  const segments = (data.segments || []) as string[];
  const goals = (data.goals || []) as string[];

  const hist = history.filter(h => h !== 'natural').map(h => HISTORY_LABEL[h]).filter(Boolean);
  if (hist.length > 0) lines.push(`Your hair has been ${hist.join(', ')}.`);
  const segs = segments.filter(s => s !== 'natural').map(s => SEGMENT_LABEL[s]).filter(Boolean);
  if (segs.length > 0) lines.push(`Right now, you're ${segs.join(', ')}.`);

  const wash = WASH_LABEL[data.wash_frequency];
  const time = TIME_LABEL[data.time_budget];
  if (wash && time) lines.push(`You ${wash}, with ${time}.`);
  else if (wash) lines.push(`You ${wash}.`);

  const labelledGoals = goals.map(g => GOAL_LABEL[g]).filter(Boolean);
  if (labelledGoals.length > 0) lines.push(`You want ${labelledGoals.join(', ')}.`);

  return lines;
}

function buildRoutineTeaser(data: any): { count: number; preview: string[] } {
  const type = data.hairType || '3A';
  const group = type.charAt(0);
  const wash = data.wash_frequency;

  const teasers: Record<string, string[]> = {
    '1': ['Gentle cleanse', 'Light condition', 'Volume styling', 'Heat protection', 'Night protect'],
    '2': ['Sulfate-free wash', 'Mid-length condition', 'Scrunch + diffuse', 'Refresh between washes', 'Satin pillow'],
    '3': ['Pre-wash oil', 'Sulfate-free cleanse', 'Layered styling', 'Seal with oil', 'Pineapple at night'],
    '4': ['Pre-wash oil', 'Co-wash or gentle cleanse', 'Deep condition weekly', 'LOC styling', 'Bonnet or satin scarf'],
  };
  const list = teasers[group] || teasers['3'];
  const count = (group === '4' ? 8 : group === '3' ? 7 : 6) + (wash !== 'daily' ? 1 : 0);
  return { count, preview: list.slice(0, 3) };
}

function generateResults(name: string, data: any) {
  const ht = data.hairType || '3A';
  const strand = data.strand_thickness;
  const porosity = data.porosity;
  const facts = [TYPE_NAMES[ht]?.toLowerCase(), STRAND_LABEL[strand], POROSITY_LABEL[porosity]]
    .filter(Boolean).join(' · ');
  return {
    name,
    hairType: ht,
    typeName: TYPE_NAMES[ht] || `Type ${ht}`,
    typeTagline: TYPE_TAGLINE[ht] || '',
    facts,
    readback: buildReadback(data),
    insight: buildOneInsight(data),
    strengths: buildStrengths(ht, strand, porosity),
    routineTeaser: buildRoutineTeaser(data),
    // Up to three short labels for the share card. Skips anything unmeasured.
    traits: [POROSITY_LABEL[porosity], STRAND_LABEL[strand], `${buildRoutineTeaser(data).count}-step routine`]
      .filter(t => t && t !== 'unmeasured'),
  };
}

// ═══════════════════════════════════════════════════════════════
// Card illustrations — one distinct shape per card
// ═══════════════════════════════════════════════════════════════

function CurlGlyph({ type, color = '#FFFEF7', size = 130 }: { type: string; color?: string; size?: number }) {
  let d = '';
  const cx = 25;
  let sw = 2.4;
  if (type === '1' || type === '1A') { d = `M${cx} 2 L${cx} 68`; sw = 2.2; }
  else if (type === '1B') { d = `M${cx} 2 Q${cx+3} 20, ${cx} 35 Q${cx-3} 50, ${cx} 68`; }
  else if (type === '1C') { d = `M${cx} 2 L${cx} 68`; sw = 3.5; }
  else if (type === '2A') { d = `M${cx} 2 Q${cx+10} 14, ${cx} 24 Q${cx-10} 34, ${cx} 44 Q${cx+8} 54, ${cx} 68`; sw = 2.2; }
  else if (type === '2B') { d = `M${cx} 2 Q${cx+12} 10, ${cx} 18 Q${cx-12} 26, ${cx} 34 Q${cx+12} 42, ${cx} 50 Q${cx-12} 58, ${cx} 68`; }
  else if (type === '2C') { d = `M${cx} 2 Q${cx+14} 7, ${cx} 13 Q${cx-14} 19, ${cx} 24 Q${cx+14} 29, ${cx} 35 Q${cx-14} 41, ${cx} 46 Q${cx+14} 51, ${cx} 57 Q${cx-14} 63, ${cx} 68`; }
  else if (type === '3' || type === '3A') { d = `M${cx} 2 C${cx+18} 5, ${cx+18} 16, ${cx} 18 C${cx-18} 20, ${cx-18} 31, ${cx} 33 C${cx+18} 35, ${cx+18} 46, ${cx} 48 C${cx-18} 50, ${cx-18} 61, ${cx} 63 L${cx} 68`; sw = 2; }
  else if (type === '3B') { d = `M${cx} 2 C${cx+16} 4, ${cx+16} 12, ${cx} 14 C${cx-16} 16, ${cx-16} 24, ${cx} 26 C${cx+16} 28, ${cx+16} 36, ${cx} 38 C${cx-16} 40, ${cx-16} 48, ${cx} 50 C${cx+16} 52, ${cx+16} 60, ${cx} 62 L${cx} 68`; sw = 2; }
  else if (type === '3C') { d = `M${cx} 2 C${cx+14} 3, ${cx+14} 9, ${cx} 10 C${cx-14} 11, ${cx-14} 17, ${cx} 18 C${cx+14} 19, ${cx+14} 25, ${cx} 26 C${cx-14} 27, ${cx-14} 33, ${cx} 34 C${cx+14} 35, ${cx+14} 41, ${cx} 42 C${cx-14} 43, ${cx-14} 49, ${cx} 50 C${cx+14} 51, ${cx+14} 57, ${cx} 58 C${cx-14} 59, ${cx-14} 65, ${cx} 66`; sw = 1.9; }
  else if (type === '4A') { d = `M${cx} 2 C${cx+11} 3, ${cx+11} 7, ${cx} 8 C${cx-11} 9, ${cx-11} 13, ${cx} 14 C${cx+11} 15, ${cx+11} 19, ${cx} 20 C${cx-11} 21, ${cx-11} 25, ${cx} 26 C${cx+11} 27, ${cx+11} 31, ${cx} 32 C${cx-11} 33, ${cx-11} 37, ${cx} 38 C${cx+11} 39, ${cx+11} 43, ${cx} 44 C${cx-11} 45, ${cx-11} 49, ${cx} 50 C${cx+11} 51, ${cx+11} 55, ${cx} 56 C${cx-11} 57, ${cx-11} 61, ${cx} 62 C${cx+11} 63, ${cx+11} 67, ${cx} 68`; sw = 1.7; }
  else if (type === '4B') { let y = 2; d = `M${cx} ${y}`; let left = true; while (y + 6 <= 68) { y += 6; d += ` L${left ? cx-10 : cx+10} ${y}`; left = !left; } sw = 1.7; }
  else if (type === '4C') { d = `M${cx} 2`; for (let y = 2; y + 5 <= 68; y += 5) { d += ` C${cx+9} ${y+1}, ${cx+9} ${y+4}, ${cx} ${y+5} C${cx-9} ${y+6}, ${cx-9} ${y+9}, ${cx} ${y+10}`; y += 5; } sw = 1.6; }
  if (!d) return null;
  return <Svg width={size * 0.7} height={size} viewBox="0 0 50 70"><Path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// ═══════════════════════════════════════════════════════════════
// Card components — one per beat of the reveal
// ═══════════════════════════════════════════════════════════════

// Small magazine-style page indicator. "01 / 07" in gold serif.
function PageNumber({ index, total }: { index: number; total: number }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <View style={st.pageNum}>
      <Text style={st.pageNumText}>{pad(index)}</Text>
      <Text style={st.pageNumSep}> / </Text>
      <Text style={st.pageNumTextDim}>{pad(total)}</Text>
    </View>
  );
}

// Card wrapper with staggered entrance: illustration first, then label,
// then headline. Creates a small editorial cascade per card.
function CardWrapper({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(420)}
      style={st.cardInner}
    >
      <PageNumber index={index} total={total} />
      {children}
    </Animated.View>
  );
}

function Card1_Reveal({ results, index, total }: { results: any; index: number; total: number }) {
  const hello = results.name === 'You' ? 'MEET YOUR HAIR' : `${results.name}, meet your hair`.toUpperCase();
  return (
    <CardWrapper index={index} total={total}>
      <Text style={st.eyebrowGold}>{hello}</Text>
      <View style={[st.illust, { marginTop: 24 }]}>
        <CurlGlyph type={results.hairType} size={150} />
      </View>
      <Text style={st.coverIssue}>TYPE {results.hairType}</Text>
      <Text style={st.coverHeadline}>{results.typeName}.</Text>
      <Text style={st.coverTagline}>{results.typeTagline}</Text>
    </CardWrapper>
  );
}

// Three single lines. No paragraphs: the longer read can live on the Me tab.
function Card2_Meaning({ results, index, total }: { results: any; index: number; total: number }) {
  const lines = [
    results.strengths?.[0],
    results.insight?.title,
    `Your routine: ${results.routineTeaser.count} steps, waiting on Home.`,
  ].filter(Boolean);
  return (
    <CardWrapper index={index} total={total}>
      <Text style={st.eyebrowGold}>WHAT IT MEANS</Text>
      <View style={{ gap: 22, marginTop: 20 }}>
        {lines.map((line: string, i: number) => (
          <View key={i} style={st.strengthRow}>
            <Text style={st.strengthNum}>0{i + 1}</Text>
            <Text style={st.strengthText}>{line}</Text>
          </View>
        ))}
      </View>
    </CardWrapper>
  );
}

// ─── The shareable card ──────────────────────────────────────────
// Drawn in a 360 x 640 design space and scaled to fit, so it keeps the
// Stories shape (9:16). Shared as a 1080 x 1920 PNG.
const CARD_W = Math.min(SCREEN_WIDTH - 72, (SCREEN_HEIGHT - 330) * 9 / 16);
const CARD_H = CARD_W * 16 / 9;
const K = CARD_W / 360;

function HairCard({ results }: { results: any }) {
  const coil = 118 * K;
  return (
    <View style={st.hairCard}>
      <Svg width={CARD_W} height={CARD_H} viewBox="0 0 360 640" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="hcSky" cx="50%" cy="62%" r="70%">
            <Stop offset="0%" stopColor="#6B4BD8" stopOpacity={0.85} />
            <Stop offset="45%" stopColor="#3A2378" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#120B2E" />
          </RadialGradient>
          <RadialGradient id="hcPlanet" cx="50%" cy="8%" r="80%">
            <Stop offset="0%" stopColor="#3B2280" />
            <Stop offset="60%" stopColor="#1B1045" />
            <Stop offset="100%" stopColor="#120B2E" />
          </RadialGradient>
          <LinearGradientSvg id="hcRim" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#F484B9" />
            <Stop offset="35%" stopColor="#C38CD9" />
            <Stop offset="65%" stopColor="#E6BEF5" />
            <Stop offset="100%" stopColor="#C38CD9" />
          </LinearGradientSvg>
          <RadialGradient id="hcGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#E6BEF5" stopOpacity={0.45} />
            <Stop offset="100%" stopColor="#E6BEF5" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="360" height="640" fill="url(#hcSky)" />
        {/* the moon bridge: a planet horizon with a halo rim */}
        <Circle cx="180" cy="850" r="430" fill="none" stroke="url(#hcRim)" strokeWidth={34} strokeOpacity={0.1} />
        <Circle cx="180" cy="850" r="430" fill="none" stroke="url(#hcRim)" strokeWidth={16} strokeOpacity={0.2} />
        <Circle cx="180" cy="850" r="430" fill="url(#hcPlanet)" />
        <Circle cx="180" cy="850" r="430" fill="none" stroke="url(#hcRim)" strokeWidth={2.5} />
        <Circle cx="180" cy="400" r="70" fill="url(#hcGlow)" />
        {[[38, 58, 1.2], [312, 82, 1.6], [266, 36, 1], [62, 268, 1.4], [330, 238, 1], [22, 366, 1.2], [294, 356, 1.4], [134, 28, 1]].map(([x, y, r], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#FFFEF7" opacity={0.65} />
        ))}
      </Svg>

      {/* the curl, standing on the horizon */}
      <View style={{ position: 'absolute', top: 420 * K - coil + 4 * K, left: 0, right: 0, alignItems: 'center' }}>
        <CurlGlyph type={results.hairType} size={coil} />
      </View>

      <View style={[st.hcTop, { top: 52 * K, paddingHorizontal: 24 * K }]}>
        <Text style={[st.hcKicker, { fontSize: 9 * K }]}>MY HAIR, DECODED</Text>
        <Text style={[st.hcType, { fontSize: 12 * K, marginTop: 16 * K }]}>TYPE {results.hairType}</Text>
        <Text style={[st.hcName, { fontSize: 46 * K, lineHeight: 50 * K }]} numberOfLines={2} adjustsFontSizeToFit>
          {results.typeName}.
        </Text>
        {!!results.typeTagline && (
          <Text style={[st.hcTagline, { fontSize: 15 * K }]}>{results.typeTagline}</Text>
        )}
        <View style={[st.hcTraits, { marginTop: 14 * K, gap: 6 * K }]}>
          {results.traits.map((t: string) => (
            <Text key={t} style={[st.hcTrait, { fontSize: 8 * K, paddingVertical: 5 * K, paddingHorizontal: 9 * K }]}>
              {t.toUpperCase()}
            </Text>
          ))}
        </View>
      </View>

      <View style={[st.hcBottom, { bottom: 46 * K }]}>
        <Text style={[st.hcHalo, { fontSize: 20 * K }]}>Step into your halo.</Text>
        <Text style={[st.hcKicker, { fontSize: 8.5 * K, marginTop: 6 * K }]}>FIND YOURS ON HALEA</Text>
      </View>
    </View>
  );
}

function Card3_Share({ results, index, total }: { results: any; index: number; total: number }) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1920 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your hair card' });
      }
    } catch (e) {
      console.log('share card failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CardWrapper index={index} total={total}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View ref={cardRef} collapsable={false}>
          <HairCard results={results} />
        </View>
        <Pressable
          onPress={share}
          style={({ pressed }) => [st.shareBtn, (pressed || busy) && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Share my hair card"
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFEF7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><Path d="M16 6l-4-4-4 4" /><Path d="M12 2v14" />
          </Svg>
          <Text style={st.shareText}>{busy ? 'Getting it ready' : 'Share my card'}</Text>
        </Pressable>
      </View>
    </CardWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════
// The reveal screen — card pager
// ═══════════════════════════════════════════════════════════════

export default function RevealScreen() {
  const router = useRouter();
  const [results, setResults] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const [userRaw, quizRaw] = await Promise.all([
        AsyncStorage.getItem('halea_user'),
        AsyncStorage.getItem('halea_quiz'),
      ]);
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const quizObj = quizRaw ? JSON.parse(quizRaw) : null;
      const name = userObj?.firstName?.trim() || 'You';
      if (quizObj) setResults(generateResults(name, quizObj));
    })();
  }, []);

  if (!results) {
    return (
      <View style={st.loading}>
        <HaloBackground />
        <Text style={st.loadingText}>Building your routine…</Text>
      </View>
    );
  }

  const TOTAL = 3;
  const isLast = step === TOTAL - 1;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) {
      // Stronger haptic for the final transition to dashboard
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)/home');
      return;
    }
    if (!hasInteracted) setHasInteracted(true);
    const next = step + 1;
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
  };

  const onScrollEnd = (e: any) => {
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIdx !== step) {
      Haptics.selectionAsync().catch(() => {});
      if (!hasInteracted) setHasInteracted(true);
      setStep(newIdx);
    }
  };

  return (
    <View style={st.container}>
      <HaloBackground />

      {/* Progress dots at top */}
      <View style={st.progressBar}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View
            key={i}
            style={[
              st.dot,
              i === step && st.dotActive,
              i < step && st.dotPast,
            ]}
          />
        ))}
      </View>

      {/* Horizontal card pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        bounces={false}
        style={st.scrollView}
      >
        <View style={st.cardSlot} key="c1">
          <Card1_Reveal results={results} index={1} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c2">
          <Card2_Meaning results={results} index={2} total={TOTAL} />
        </View>
        <View style={st.cardSlot} key="c3">
          <Card3_Share results={results} index={3} total={TOTAL} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={st.footer}>
        <HaloButton label={isLast ? 'Take me home' : 'Next'} onPress={goNext} />
        {!isLast && !hasInteracted && step === 0 && (
          <Text style={st.swipeHint}>Or swipe →</Text>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.porcelain },
  loadingText: { fontFamily: Fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 12,
  },
  dot: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotPast: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#C38CD9',
    width: 32,
  },

  scrollView: { flex: 1 },

  cardSlot: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  cardInner: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },

  illust: {
    alignItems: 'center',
    marginBottom: 32,
  },

  // Magazine-style page indicator (top of each card)
  pageNum: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  pageNumText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: '#C38CD9',
  },
  pageNumSep: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,254,247,0.4)',
  },
  pageNumTextDim: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,254,247,0.4)',
  },

  eyebrowGold: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    color: '#C38CD9',
    marginBottom: 18,
    textAlign: 'center',
  },

  // Card 1: opening

  // Card 2: cover
  coverIssue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 4,
    color: '#C38CD9',
    textAlign: 'center',
    marginBottom: 20,
  },
  coverHeadline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 44,
    color: '#FFFEF7',
    letterSpacing: -1.5,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  coverTagline: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 17,
    color: '#8C5A3C',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Card 3: readback

  // Card 4: insight

  // Card 5: strengths
  strengthRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  strengthNum: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: '#C38CD9',
    letterSpacing: -0.5,
    minWidth: 36,
  },
  strengthText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFEF7',
    flex: 1,
    paddingTop: 4,
  },

  // Card 6: routine teaser

  // Card 7: closer

  // Footer
  hairCard: { width: CARD_W, height: CARD_H, borderRadius: 18 * K, overflow: 'hidden', backgroundColor: '#120B2E' },
  hcTop: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hcKicker: { fontFamily: 'Sora_500Medium', letterSpacing: 3, color: 'rgba(255,254,247,0.6)' },
  hcType: { fontFamily: 'Sora_600SemiBold', letterSpacing: 3, color: '#E6BEF5' },
  hcName: { fontFamily: 'Fraunces_700Bold', letterSpacing: -1, color: '#FFFEF7', textAlign: 'center', marginTop: 6 },
  hcTagline: { fontFamily: 'Fraunces_400Regular_Italic', color: 'rgba(255,254,247,0.8)', textAlign: 'center', marginTop: 6 },
  hcTraits: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  hcTrait: {
    fontFamily: 'Sora_500Medium', letterSpacing: 1.4, color: '#FFFEF7',
    borderWidth: 1, borderColor: 'rgba(255,254,247,0.22)', borderRadius: 999, overflow: 'hidden',
  },
  hcBottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hcHalo: { fontFamily: 'Fraunces_400Regular_Italic', color: '#FFFEF7' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(230,190,245,0.5)', backgroundColor: 'rgba(118,67,172,0.3)',
  },
  shareText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: '#FFFEF7' },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    backgroundColor: 'transparent',
  },
  swipeHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255,254,247,0.4)',
    textAlign: 'center',
    marginTop: 10,
  },
});