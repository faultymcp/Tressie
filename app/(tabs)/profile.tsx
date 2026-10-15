import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import Pressable from '@/components/primitives/Pressable';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { FluidOrb } from '@/components/FluidOrb';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInUp } from 'react-native-reanimated';

// ─── Icons ───────────────────────────────────────────────────────
const IC = {
  Chevron: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>,
  Star: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>,
  Heart: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Svg>,
  Settings: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></Svg>,
  HelpCircle: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><Line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
  Shield: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
  LogOut: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.error} strokeWidth={1.6} strokeLinecap="round"><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><Path d="M16 17l5-5-5-5" /><Line x1="21" y1="12" x2="9" y2="12" /></Svg>,
  BarChart: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M18 20V10M12 20V4M6 20v-6" /></Svg>,
  Edit: () => <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.violet} strokeWidth={1.6} strokeLinecap="round"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Svg>,
  Flame: () => <Svg width={14} height={14} viewBox="0 0 24 24" fill={Colors.pink} stroke="none"><Path d="M12 2c1 4-2 6-2 10a4 4 0 008 0c0-2-1-3-2-4 0 2-1 3-2 3s-2-1-2-3c0-1 .5-2 1-3-1 0-1.5 1-1.5 1S10 4 12 2z" /></Svg>,
};

const TYPE_NAMES: Record<string, string> = {
  '1A': 'Pin Straight', '1B': 'Straight with Body', '1C': 'Straight & Thick',
  '2A': 'Loose Waves', '2B': 'Defined Waves', '2C': 'Deep Waves',
  '3A': 'Loose Curls', '3B': 'Springy Ringlets', '3C': 'Tight Corkscrews',
  '4A': 'Coil Springs', '4B': 'Z-Pattern Coils', '4C': 'Ultra-Tight Coils',
};
// ─── Row Component ───────────────────────────────────────────────
function MenuRow({ icon, label, sublabel, right, rightColor, onPress, last, destructive }: {
  icon: React.ReactNode; label: string; sublabel?: string; right?: string; rightColor?: string;
  onPress: () => void; last?: boolean; destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.menuRow, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <View style={st.menuIcon}>{icon}</View>
      <View style={st.menuBody}>
        <Text style={[st.menuLabel, destructive && { color: Colors.error }]}>{label}</Text>
        {sublabel && <Text style={st.menuSublabel}>{sublabel}</Text>}
      </View>
      {right && <Text style={[st.menuRight, rightColor ? { color: rightColor } : null]}>{right}</Text>}
      {!destructive && <IC.Chevron />}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={st.sectionLabel}>{children}</Text>;
}

// ─── Screen ──────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('User');
  const [hairType, setHairType] = useState('');
  const [streak, setStreak] = useState(0);
  const [totalFavs, setTotalFavs] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
      }

      // Match Home: prefer firstName from halea_user, then metadata, then email local-part
      let resolvedName = '';
      try {
        const userRaw = await AsyncStorage.getItem('halea_user');
        if (userRaw) {
          const u = JSON.parse(userRaw);
          if (u?.firstName) resolvedName = u.firstName;
        }
      } catch (e) {}
      if (!resolvedName) {
        resolvedName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      }
      setName(resolvedName);

      const quizRaw = await AsyncStorage.getItem('halea_quiz');
      if (quizRaw) {
        const q = JSON.parse(quizRaw);
        setHairType(q.hairType || '');
      }

      if (user) {
        try {
          const { data: sd } = await supabase.from('xp_balances').select('current_daily_streak').eq('user_id', user.id).maybeSingle();
          if (sd) setStreak(sd.current_daily_streak || 0);
        } catch (e) {}

        try {
          const { count } = await supabase.from('favourites').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
          setTotalFavs(count || 0);
        } catch (e) {}

      }
    } catch (e) {
      console.log('Profile fetch error:', e);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace('/'); };

  const typeName = TYPE_NAMES[hairType] || '';
  const initial = name.charAt(0).toUpperCase();

  if (loading) {
    return <View style={st.loadingWrap}><ActivityIndicator size="large" color={Colors.violet} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.porcelain }}>
      <FluidOrb color={Colors.violet} size={380} top={-80} left={200} spinDuration={16000} spinDirection={1} breatheDuration={4000} baseOpacity={0.22} />
      <FluidOrb color={Colors.pink} size={300} top={540} left={-80} spinDuration={20000} spinDirection={-1} breatheDuration={4600} baseOpacity={0.14} />
      <ScrollView
        style={st.container} contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.violet} />}
      >
      <View style={st.header}><Text style={st.pageTitle}>Profile</Text></View>

      {/* User card */}
      <Animated.View entering={FadeInUp.duration(280)}>
        <Pressable onPress={() => router.push('/settings')} style={st.userCard}>
          <View style={st.avatar}><Text style={st.avatarText}>{initial}</Text></View>
          <View style={st.userInfo}>
            <Text style={st.userName}>{name}</Text>
            <Text style={st.userMeta}>{hairType ? `Type ${hairType} · ${typeName}` : 'Complete your hair quiz'}</Text>
            {/* Streak lives with the person, as a small pill, not its own box */}
            <View style={[st.streakPill, streak === 0 && st.streakPillOff]}>
              <IC.Flame />
              <Text style={st.streakText}>
                {streak === 0 ? 'Start your streak today' : `${streak}-day streak`}
              </Text>
            </View>
          </View>
          <IC.Edit />
        </Pressable>
      </Animated.View>

      {/* Activity */}
      <Animated.View entering={FadeInUp.duration(280).delay(80)}>
        <SectionLabel>Activity</SectionLabel>
        <View style={st.menuCard}>
          <MenuRow icon={<IC.Heart />} label="Favourites" sublabel={`${totalFavs} saved items`} onPress={() => router.push('/favourites')} last />
        </View>
      </Animated.View>

      {/* Account */}
      <Animated.View entering={FadeInUp.duration(280).delay(120)}>
        <SectionLabel>Account</SectionLabel>
        <View style={st.menuCard}>
          <MenuRow icon={<IC.Star />} label="Face scan" sublabel="Your face shape and styles to try" onPress={() => router.push('/face-scan')} />
          <MenuRow icon={<IC.BarChart />} label="Hair Health Score" onPress={() => router.push('/reveal')} last />
        </View>
      </Animated.View>

      {/* General */}
      <Animated.View entering={FadeInUp.duration(280).delay(160)}>
        <SectionLabel>General</SectionLabel>
        <View style={st.menuCard}>
          <MenuRow icon={<IC.Settings />} label="Settings" sublabel="Account and hair profile" onPress={() => router.push('/settings')} />
          <MenuRow icon={<IC.Shield />} label="Privacy & Data" sublabel="Your data and deleting your account" onPress={() => router.push('/privacy')} />
          <MenuRow icon={<IC.HelpCircle />} label="Help & Support" sublabel="FAQ, contact us" onPress={() => router.push('/help')} last />
        </View>
      </Animated.View>

      {/* Sign out */}
      <Animated.View entering={FadeInUp.duration(280).delay(200)}>
        <View style={st.menuCard}>
          <MenuRow icon={<IC.LogOut />} label="Sign out" onPress={handleSignOut} destructive last />
        </View>
        <Text style={st.emailLabel}>{email}</Text>
        <Text style={st.version}>Halea v1.0.0</Text>
      </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingTop: Platform.OS === 'ios' ? 62 : 48, paddingBottom: 130 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.porcelain },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  pageTitle: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.ink, letterSpacing: -0.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.white, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 56, height: 56, borderRadius: 999, backgroundColor: 'rgba(118,67,172,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.heading, fontSize: 22, color: '#FFFFFF' },
  userInfo: { flex: 1 },
  userName: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.ink, marginBottom: 2 },
  userMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 24, backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.ink, marginBottom: 2 },
  statLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingVertical: 4, paddingLeft: 8, paddingRight: 12, borderRadius: 999,
    backgroundColor: 'rgba(244,132,185,0.14)', borderWidth: 1, borderColor: 'rgba(244,132,185,0.35)',
  },
  streakPillOff: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  streakText: { fontFamily: 'Sora_500Medium', fontSize: 12, color: Colors.ink },
  sectionLabel: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8, marginTop: 4 },
  menuCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { width: 24, alignItems: 'center' },
  menuBody: { flex: 1 },
  menuLabel: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  menuSublabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  menuRight: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.ink, marginRight: 4 },
  emailLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: 4 },
  version: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 4, opacity: 0.4 },
});