// app/(tabs)/home.tsx
//
// Halea home: one glance tells you where you are in your hair week.
//
// Layout (top to bottom):
//   1. Masthead: date, greeting, streak pill
//   2. Week strip (Stardust style): Mon to Sun, each day with its own small
//      ring showing how much of that day got done. Wash days carry a drop.
//      Tap a day to preview its steps.
//   3. The halo: a big ring that fills as today's steps get ticked. When the
//      day is complete it turns lime and reads "Halo on."
//   4. Steps card: today's steps, one tap each. Other days show read-only.
//   5. Wash day card (Shea style): countdown plus the steps of the next wash.
//
// Home is only "your hair today". Stylists live in Discover and the product
// shelf in Products; a product shows here only inside the step that uses it.
//
// Data is exactly what Home already loaded: week plan, checks, days since
// wash, streak, products. No new backend.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Animated as RNAnimated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/theme';
import { HaloBackground } from '@/components/HaloBackground';
import { HaloButton } from '@/components/HaloButton';
import { supabase } from '@/lib/supabase';
import {
  bootstrapUserRoutine,
  fetchRoutineFromDB,
  getUserRoutineSteps,
  markStepComplete,
  getTodayCompletions,
  getCurrentUserId,
  type RoutineStep as LibRoutineStep,
} from '@/lib/routines';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const todayLabel = () => DAYS[todayIdx()];

const CREAM = '#FFFEF7';
const CREAM_DIM = 'rgba(255,254,247,0.6)';
const LAV_LIGHT = '#E6BEF5';

type Step = LibRoutineStep;
type DayPlan = { label: string; steps: Step[] };

// ─── Icons ───────────────────────────────────────────────────────
function IconCheck({ color = Colors.porcelain }: { color?: string }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>;
}
function IconFlame() {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.lime} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z" /></Svg>;
}
function IconDrop({ size = 10, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size * 1.17} viewBox="0 0 24 28" fill={filled ? Colors.lavender : 'none'} stroke={Colors.lavender} strokeWidth={filled ? 0 : 1.6}>
      <Path d="M12 1C8 8 3 13 3 19a9 9 0 0018 0c0-6-5-11-9-18z" />
    </Svg>
  );
}

// ─── Greeting and date ───────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late evening';
}
function dateMasthead(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${day} ${d.getDate()} ${month}`;
}
// Date numbers for this week, Monday first.
function weekDates(): number[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx());
  return DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d.getDate(); });
}

// ─── Fallback routine ────────────────────────────────────────────
// Used only when both the user layer (Supabase per-user routine) and the
// template layer (Supabase routine_templates) fail or return nothing —
// e.g. guest mode with no network. Step shape must satisfy lib RoutineStep,
// so `frequency` and `xp` are required.
function buildWeekFallback(): Record<string, DayPlan> {
  const mk = (id: string, name: string, desc: string, frequency = 'daily'): Step =>
    ({ id, name, desc, frequency, xp: 10 });
  const refresh = mk('moisturise', 'Moisturise', 'Light leave-in or water-based spray');
  const protect = mk('protect', 'Night protection', 'Satin bonnet or pillowcase');
  const refreshDay = { label: 'Refresh day', steps: [refresh, protect] };
  const styleDay = { label: 'Style day', steps: [
    mk('moisturise-restyle', 'Moisturise + restyle', 'Refresh curls or smooth waves'),
    refresh, protect,
  ]};
  const washDay = { label: 'Wash day', steps: [
    mk('cleanse', 'Cleanse', 'Gentle shampoo on scalp', 'weekly'),
    mk('condition', 'Condition', 'Mid-length to ends, detangle', 'weekly'),
    mk('deep', 'Deep condition', 'Mask for 20 minutes', 'weekly'),
    mk('style', 'Style', 'Apply styling products to wet hair', 'weekly'),
    protect,
  ]};
  return {
    Mon: refreshDay, Tue: refreshDay, Wed: styleDay, Thu: refreshDay,
    Fri: refreshDay, Sat: washDay, Sun: refreshDay,
  };
}

// ─── Award XP ────────────────────────────────────────────────────
async function doAwardXp(action: string, refId?: string, desc?: string): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: user.id, p_action: action,
      p_reference_id: refId || null, p_description: desc || null, p_override_amount: null,
    });
    if (error) return 0;
    return data || 0;
  } catch { return 0; }
}

// ─── XP Toast ────────────────────────────────────────────────────
function XpToast({ amount, visible }: { amount: number; visible: boolean }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(20)).current;
  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
          RNAnimated.timing(translateY, { toValue: 20, duration: 240, useNativeDriver: true }),
        ]).start();
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [visible]);
  return (
    <RNAnimated.View style={[st.toast, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={st.toastText}>+{amount} XP</Text>
    </RNAnimated.View>
  );
}

// ─── The halo ring ───────────────────────────────────────────────
// Fills as today's steps are ticked. A wider, faint copy of the arc
// underneath gives it a glow without needing SVG filters.
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);
const RING = 210;
const R = 88;
const CIRC = 2 * Math.PI * R;

function HaloRing({ done, total }: { done: number; total: number }) {
  const progress = total > 0 ? done / total : 0;
  const complete = total > 0 && done === total;
  const anim = useRef(new RNAnimated.Value(progress)).current;

  useEffect(() => {
    RNAnimated.timing(anim, {
      toValue: progress, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [progress]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const arc = complete ? Colors.lime : LAV_LIGHT;
  const visible = progress > 0 ? 1 : 0;

  return (
    <View style={st.ringWrap}>
      <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
        <AnimatedCircle
          cx={RING / 2} cy={RING / 2} r={R} fill="none"
          stroke={arc} strokeWidth={24} strokeOpacity={0.14 * visible}
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset} strokeLinecap="round"
        />
        <AnimatedCircle
          cx={RING / 2} cy={RING / 2} r={R} fill="none"
          stroke={arc} strokeWidth={10} strokeOpacity={visible}
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset} strokeLinecap="round"
        />
      </Svg>
      <View style={st.ringCenter} pointerEvents="none">
        {total === 0 ? (
          <Text style={st.ringDone}>Rest day.</Text>
        ) : complete ? (
          <>
            <Text style={st.ringDone}>Halo on.</Text>
            <Text style={st.ringLabel}>ALL DONE TODAY</Text>
          </>
        ) : (
          <>
            <Text style={st.ringCount}>
              {done}<Text style={st.ringTotal}>/{total}</Text>
            </Text>
            <Text style={st.ringLabel}>TODAY</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Home screen
// ═══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [weekPlan, setWeekPlan] = useState<Record<string, DayPlan>>({});
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [daysSinceWash, setDaysSinceWash] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [xpToday, setXpToday] = useState(0);
  const [toastAmount, setToastAmount] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  // Which day the steps card shows. Today is tickable; other days are a read-only preview.
  const [selectedDay, setSelectedDay] = useState(todayLabel());
  const [washKnown, setWashKnown] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const stepsY = useRef(0);

  const showXpToast = (amount: number) => {
    setToastAmount(amount);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // Load all data on mount
  useEffect(() => {
    (async () => {
      // User name
      const userRaw = await AsyncStorage.getItem('halea_user');
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      setFirstName(userObj?.firstName?.trim() || '');

      // Quiz data
      const quizRaw = await AsyncStorage.getItem('halea_quiz');
      const data = quizRaw ? JSON.parse(quizRaw) : null;
      const ht = data?.hairType || '3A';
      const goals = data?.goals || [];
      const segs = data?.segments || ['natural'];

      // Build routine — try the user layer (Supabase per-user copy) first,
      // fall back to the template layer / local fallback if unauthenticated
      // or DB is unreachable.
      const userId = await getCurrentUserId();
      let dbPlan: Record<string, DayPlan> | null = null;

      // Read local checks first so server seed (below) is authoritative.
      const checksRaw = await AsyncStorage.getItem('halea_checks');
      if (checksRaw) {
        try { setChecks(JSON.parse(checksRaw)); } catch {}
      }

      if (userId) {
        dbPlan = await getUserRoutineSteps(userId);
        // Home-open safety net: if authenticated but no routine in DB
        // (e.g. user signed in AFTER completing the quiz), bootstrap now.
        if (!dbPlan) {
          await bootstrapUserRoutine(userId, goals, segs);
          dbPlan = await getUserRoutineSteps(userId, { skipCache: true });
        }

        // Seed `checks` state from server-side completions so the UI
        // shows what's actually been done today across devices.
        const todayComps = await getTodayCompletions(userId);
        if (todayComps.length > 0) {
          const todayKey = todayLabel();
          const seeded: Record<string, boolean> = {};
          for (const c of todayComps) seeded[c.step_id] = true;
          setChecks(prev => ({ ...prev, [todayKey]: { ...(prev[todayKey] || {}), ...seeded } }));
        }
      }

      // Final fallback chain: user layer → template layer → local builder.
      if (!dbPlan) dbPlan = await fetchRoutineFromDB(goals, segs);
      setWeekPlan(dbPlan || buildWeekFallback());

      // Days since wash (rough estimate from check history)
      const lastWashRaw = await AsyncStorage.getItem('halea_last_wash');
      if (lastWashRaw) {
        const last = new Date(lastWashRaw);
        const diff = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
        setDaysSinceWash(Math.max(0, Math.min(diff, 14)));
        setWashKnown(true);
      }

      // Daily login XP
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await AsyncStorage.getItem('halea_last_login_xp');
      if (lastLogin !== today) {
        const xp = await doAwardXp('daily_login', undefined, 'Daily app open');
        if (xp > 0) { setXpToday(prev => prev + xp); showXpToast(xp); }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.rpc('update_streak', { p_user_id: user.id });
        } catch {}
        await AsyncStorage.setItem('halea_last_login_xp', today);
      }

      // Streak
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: sd } = await supabase.from('xp_balances')
            .select('current_daily_streak').eq('user_id', user.id).maybeSingle();
          if (sd) setStreak(sd.current_daily_streak || 0);
        }
      } catch {}

      // Products for this hair type, matched to steps by category below
      supabase.from('products').select('id, name, brand, category').contains('hair_types', [ht.charAt(0)]).limit(40)
        .then(({ data: prods }) => { if (prods) setProducts(prods); });

    })();
  }, []);

  // Toggle a step done/undone.
  // Source of truth is Supabase routine_completions (via markStepComplete).
  // Local `checks` is kept in sync for instant UI feedback. Falls back to
  // AsyncStorage-only mode when the user isn't authenticated.
  const toggleStep = useCallback(async (stepId: string, stepName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const day = todayLabel();
    const dayChecks = { ...(checks[day] || {}) };
    const wasDone = !!dayChecks[stepId];
    dayChecks[stepId] = !wasDone;
    const updated = { ...checks, [day]: dayChecks };
    setChecks(updated);

    // Last step of the day: the halo closes. Give it a proper success buzz.
    const todayPlan = weekPlan[day];
    if (!wasDone && todayPlan && todayPlan.steps.length > 0 && todayPlan.steps.every(s => updated[day]?.[s.id])) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await AsyncStorage.setItem('halea_checks', JSON.stringify(updated)).catch(() => {});

    // If wash step completed, record wash date
    if (!wasDone && (stepName.toLowerCase().includes('cleanse') || stepName.toLowerCase().includes('wash') || stepName.toLowerCase().includes('shampoo'))) {
      await AsyncStorage.setItem('halea_last_wash', new Date().toISOString());
      setDaysSinceWash(0);
      setWashKnown(true);
    }

    // Persist to Supabase + award XP via the lib data layer.
    // The step's routine_id is on the Step itself (carried through from
    // getUserRoutineSteps). If it's missing, the user is on the template
    // fallback and we can only update locally.
    const today = weekPlan[day];
    const step = today?.steps.find(s => s.id === stepId);
    const routineId = step?.routine_id;
    const userId = await getCurrentUserId();

    if (!wasDone && userId && routineId) {
      const xp = await markStepComplete(userId, routineId, stepId, true);
      if (xp > 0) {
        setXpToday(prev => prev + xp);
        showXpToast(xp);
        // Bonus when every step for today is done
        if (today && today.steps.every(s => updated[day]?.[s.id])) {
          const bonus = await doAwardXp('complete_full_routine', undefined, 'Full routine done');
          if (bonus > 0) {
            setTimeout(() => { setXpToday(p => p + bonus); showXpToast(bonus); }, 1000);
          }
        }
      }
    } else if (!wasDone && !userId) {
      // Local-only fallback (unauthenticated): keep old XP behaviour so
      // the UX doesn't degrade for guests.
      const xp = await doAwardXp('complete_routine_step', stepId, `Completed: ${stepName}`);
      if (xp > 0) {
        setXpToday(prev => prev + xp);
        showXpToast(xp);
        if (today && today.steps.every(s => updated[day]?.[s.id])) {
          const bonus = await doAwardXp('complete_full_routine', undefined, 'Full routine done');
          if (bonus > 0) {
            setTimeout(() => { setXpToday(p => p + bonus); showXpToast(bonus); }, 1000);
          }
        }
      }
    } else if (wasDone && userId && routineId) {
      // Uncheck — remove the completion in DB (no XP refund; ledger is append-only)
      await markStepComplete(userId, routineId, stepId, false);
    }
  }, [checks, weekPlan]);

  const today = weekPlan[todayLabel()] || { label: '', steps: [] };
  const todayChecks = checks[todayLabel()] || {};
  const completedCount = today.steps.filter(s => todayChecks[s.id]).length;
  const totalCount = today.steps.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const todayKey = todayLabel();
  const tIdx = todayIdx();
  const dates = weekDates();

  // Where you are in your wash week, in one line under the halo.
  const nextWash = (() => {
    for (let i = 1; i <= 7; i++) {
      const d = DAYS[(tIdx + i) % 7];
      if (weekPlan[d]?.label === 'Wash day') return { day: d, inDays: i };
    }
    return null;
  })();
  const cycleLine = (() => {
    if (today.label === 'Wash day') return 'Take your time with this one.';
    const next = nextWash ? `wash day ${nextWash.inDays === 1 ? 'tomorrow' : DAY_FULL[nextWash.day]}` : '';
    if (washKnown) return `Day ${daysSinceWash + 1} since wash${next ? ` · ${next}` : ''}`;
    return next ? next.charAt(0).toUpperCase() + next.slice(1) : '';
  })();

  // Each day's little ring in the strip. Checks are stored per weekday, so
  // only days up to today are filled in; later days are still to come.
  const strip = DAYS.map((d, i) => {
    const plan = weekPlan[d];
    const n = plan?.steps.length || 0;
    let pct = 0;
    if (i === tIdx) pct = progress;
    else if (i < tIdx && n > 0) pct = plan!.steps.filter(s => checks[d]?.[s.id]).length / n;
    return { d, i, date: dates[i], pct, wash: plan?.label === 'Wash day' };
  });

  const viewing = selectedDay === todayKey;
  const shownPlan = weekPlan[selectedDay] || { label: '', steps: [] };
  const washPlan = nextWash ? weekPlan[nextWash.day] : null;

  // The one product a step needs, if we have one in its category.
  const productFor = (step: Step) => {
    const cats = step.recommended_categories || [];
    return cats.length ? products.find(p => cats.includes(p.category)) : undefined;
  };

  const pickDay = (d: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDay(d);
  };
  const openWashDay = () => {
    if (!nextWash) return;
    pickDay(nextWash.day);
    scrollRef.current?.scrollTo({ y: Math.max(0, stepsY.current - 24), animated: true });
  };

  return (
    <View style={st.container}>
      <HaloBackground />
      <ScrollView ref={scrollRef} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 1. Masthead ── */}
        <View style={st.masthead}>
          <View style={{ flex: 1 }}>
            <Text style={st.dateLabel}>{dateMasthead()}</Text>
            <Text style={st.greeting}>
              {greeting()}{firstName ? ', ' : '.'}
              {firstName ? <Text style={st.greetingName}>{firstName}.</Text> : null}
            </Text>
          </View>
          {streak > 0 && (
            <View style={st.streakPill} accessibilityLabel={`${streak} day streak`}>
              <IconFlame />
              <Text style={st.streakText}>{streak} {streak === 1 ? 'day' : 'days'}</Text>
            </View>
          )}
        </View>

        {/* ── 2. Week strip ── */}
        <View style={st.strip}>
          {strip.map(s => {
            const isToday = s.i === tIdx;
            const isPicked = s.d === selectedDay;
            const r = 16;
            const c = 2 * Math.PI * r;
            return (
              <Pressable
                key={s.d}
                onPress={() => pickDay(s.d)}
                style={({ pressed }) => [st.stripDay, pressed && { transform: [{ scale: 0.94 }] }]}
                accessibilityRole="button"
                accessibilityState={{ selected: isPicked }}
                accessibilityLabel={`${DAY_FULL[s.d]}${s.wash ? ', wash day' : ''}${isToday ? ', today' : ''}`}
              >
                <Text style={[st.stripLetter, isToday && { color: Colors.lime }]}>{s.d.charAt(0)}</Text>
                <View style={[st.stripCircle, isPicked && st.stripCirclePicked]}>
                  <Svg width={40} height={40} style={StyleSheet.absoluteFill}>
                    <Circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
                    {s.pct > 0 && (
                      <Circle
                        cx={20} cy={20} r={r} fill="none"
                        stroke={s.pct >= 1 ? Colors.lime : LAV_LIGHT} strokeWidth={3} strokeLinecap="round"
                        strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - s.pct)}
                        transform="rotate(-90 20 20)"
                      />
                    )}
                  </Svg>
                  <Text style={st.stripDate}>{s.date}</Text>
                </View>
                <View style={st.stripMark}>{s.wash ? <IconDrop /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        {/* ── 3. The halo ── */}
        <View style={st.hero}>
          <HaloRing done={completedCount} total={totalCount} />
          <Text style={st.heroTitle}>{today.label || 'A quiet day.'}</Text>
          {!!cycleLine && <Text style={st.heroSub}>{cycleLine}</Text>}
        </View>

        {/* ── 4. Steps ── */}
        <View style={st.card} onLayout={e => { stepsY.current = e.nativeEvent.layout.y; }}>
          {!viewing && (
            <View style={st.previewHead}>
              <Text style={st.previewTitle}>{DAY_FULL[selectedDay]} · {shownPlan.label || 'Nothing planned'}</Text>
              <Pressable onPress={() => pickDay(todayKey)} style={st.backPill} accessibilityRole="button" accessibilityLabel="Back to today">
                <Text style={st.backPillText}>Today</Text>
              </Pressable>
            </View>
          )}

          {viewing && today.steps.length === 0 && (
            <Text style={st.emptyText}>Nothing planned today. Rest counts too.</Text>
          )}

          {viewing
            ? today.steps.map((step, i) => {
                const done = !!todayChecks[step.id];
                return (
                  <Pressable
                    key={step.id}
                    onPress={() => toggleStep(step.id, step.name)}
                    style={({ pressed }) => [st.stepRow, i > 0 && st.stepDivider, pressed && { opacity: 0.7 }]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={`${done ? 'Done' : 'Tick off'}: ${step.name}`}
                  >
                    <View style={[st.check, done && st.checkDone]}>{done && <IconCheck />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.stepName, done && st.stepNameDone]} numberOfLines={2}>{step.name}</Text>
                      {(() => {
                        const prod = productFor(step);
                        if (!prod) return null;
                        return (
                          <Pressable
                            onPress={() => router.push('/(tabs)/products')}
                            hitSlop={8}
                            style={st.stepProduct}
                            accessibilityRole="link"
                            accessibilityLabel={`Product for this step: ${prod.name}`}
                          >
                            <View style={st.stepProductThumb} />
                            <Text style={st.stepProductText} numberOfLines={1}>with {prod.brand ? `${prod.brand} ` : ''}{prod.name}</Text>
                          </Pressable>
                        );
                      })()}
                    </View>
                    <Text style={st.stepXp}>+{step.xp ?? 10}</Text>
                  </Pressable>
                );
              })
            : shownPlan.steps.map((step, i) => (
                <View key={step.id} style={[st.stepRow, i > 0 && st.stepDivider]}>
                  <View style={st.previewDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepName}>{step.name}</Text>
                    {!!step.desc && <Text style={st.stepDesc} numberOfLines={1}>{step.desc}</Text>}
                  </View>
                </View>
              ))}
        </View>

        {/* ── 5. Wash day ── */}
        {nextWash && washPlan && today.label !== 'Wash day' && (
          <View style={st.washCard}>
            <View style={st.washTop}>
              <View style={{ flex: 1 }}>
                <Text style={st.washLabel}>
                  {nextWash.inDays === 1 ? 'WASH DAY TOMORROW' : `WASH DAY IN ${nextWash.inDays} DAYS`}
                </Text>
                <Text style={st.washTitle}>{DAY_FULL[nextWash.day]}</Text>
                <Text style={st.washSub}>{washPlan.steps.length} steps</Text>
              </View>
              <IconDrop size={26} filled={false} />
            </View>
            <View style={st.washSteps}>
              {washPlan.steps.slice(0, 5).map(s => (
                <View key={s.id} style={st.washStep}>
                  <View style={st.washBar} />
                  <Text style={st.washStepText} numberOfLines={1}>{s.name}</Text>
                </View>
              ))}
            </View>
            <HaloButton label="See wash day" onPress={openWashDay} />
          </View>
        )}

      </ScrollView>

      <XpToast amount={toastAmount} visible={toastVisible} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles: dark glass on the halo. Fraunces for display, Sora for labels,
// Inter for body. Lime only for "done" and today.
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  scroll: { paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 22, paddingBottom: 140 },

  // 1. Masthead
  masthead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 22 },
  dateLabel: { fontFamily: 'Sora_500Medium', fontSize: 11, letterSpacing: 2, color: CREAM_DIM },
  greeting: { fontFamily: Fonts.heading, fontSize: 30, letterSpacing: -0.5, color: CREAM, marginTop: 4 },
  greetingName: { fontFamily: 'Fraunces_400Regular_Italic', color: LAV_LIGHT },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 999, backgroundColor: 'rgba(195,140,217,0.1)', borderWidth: 1, borderColor: 'rgba(195,140,217,0.35)',
    marginBottom: 4,
  },
  streakText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.lime },

  // 2. Week strip
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stripDay: { alignItems: 'center', gap: 6, paddingVertical: 4, minWidth: 44 },
  stripLetter: { fontFamily: 'Sora_500Medium', fontSize: 10, letterSpacing: 1, color: 'rgba(255,254,247,0.55)' },
  stripCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stripCirclePicked: { backgroundColor: 'rgba(255,254,247,0.14)' },
  stripDate: { fontFamily: Fonts.bodySemi, fontSize: 13, color: CREAM },
  stripMark: { height: 12, alignItems: 'center', justifyContent: 'center' },

  // 3. Halo
  hero: { alignItems: 'center', marginBottom: 22 },
  ringWrap: { width: RING, height: RING },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  ringCount: { fontFamily: Fonts.heading, fontSize: 48, letterSpacing: -1, color: CREAM },
  ringTotal: { fontFamily: Fonts.heading, fontSize: 26, color: 'rgba(255,254,247,0.5)' },
  ringDone: { fontFamily: 'Fraunces_400Regular_Italic', fontSize: 30, color: Colors.lime },
  ringLabel: { fontFamily: 'Sora_500Medium', fontSize: 11, letterSpacing: 2, color: CREAM_DIM },
  heroTitle: { fontFamily: Fonts.headingSemi, fontSize: 20, color: CREAM, marginTop: 14 },
  heroSub: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,254,247,0.65)', marginTop: 4, textAlign: 'center' },

  // 4. Steps
  card: {
    borderRadius: 24, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16,
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6, gap: 10 },
  previewTitle: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: 12, letterSpacing: 0.5, color: LAV_LIGHT },
  backPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(195,140,217,0.4)' },
  backPillText: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.lime },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: CREAM_DIM, paddingVertical: 16, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingVertical: 8 },
  stepDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,254,247,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  stepName: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: CREAM },
  stepNameDone: { color: 'rgba(255,254,247,0.45)', textDecorationLine: 'line-through' },
  stepDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  stepProduct: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, alignSelf: 'flex-start' },
  stepProductThumb: { width: 18, height: 18, borderRadius: 5, backgroundColor: Colors.lavender, opacity: 0.8 },
  stepProductText: { fontFamily: Fonts.body, fontSize: 12, color: LAV_LIGHT, flexShrink: 1 },
  stepXp: { fontFamily: 'Sora_500Medium', fontSize: 11, color: 'rgba(255,254,247,0.45)' },
  previewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lavender, marginHorizontal: 9 },

  // 5. Wash day
  washCard: {
    borderRadius: 24, backgroundColor: 'rgba(118,67,172,0.28)', borderWidth: 1, borderColor: 'rgba(230,190,245,0.35)',
    padding: 18, gap: 16, marginBottom: 24,
  },
  washTop: { flexDirection: 'row', alignItems: 'flex-start' },
  washLabel: { fontFamily: 'Sora_500Medium', fontSize: 10, letterSpacing: 2, color: LAV_LIGHT },
  washTitle: { fontFamily: Fonts.heading, fontSize: 22, color: CREAM, marginTop: 4 },
  washSub: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,254,247,0.65)', marginTop: 2 },
  washSteps: { flexDirection: 'row', gap: 6 },
  washStep: { flex: 1, alignItems: 'center', gap: 6 },
  washBar: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: 'rgba(230,190,245,0.5)' },
  washStepText: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(255,254,247,0.7)' },

  // XP toast
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.violet,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});