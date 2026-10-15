import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Platform, Alert,
} from 'react-native';
import Pressable from '@/components/primitives/Pressable';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { deleteMyAccount } from '@/lib/deleteAccount';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsOn, setAnalyticsOn } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';

// ─── Icons ───────────────────────────────────────────────────────
const IC = {
  Back: () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M19 12H5M12 19l-7-7 7-7" /></Svg>,
  Bell: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 01-3.46 0" /></Svg>,
  Globe: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M2 12h20" /><Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></Svg>,
  User: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>,
  Lock: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0110 0v4" /></Svg>,
  Download: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><Path d="M7 10l5 5 5-5" /><Line x1="12" y1="15" x2="12" y2="3" /></Svg>,
  Trash: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.error} strokeWidth={1.6} strokeLinecap="round"><Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></Svg>,
  Chevron: () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round"><Path d="M9 18l6-6-6-6" /></Svg>,
  Mail: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Rect x="2" y="4" width="20" height="16" rx="2" /><Path d="M22 7l-10 7L2 7" /></Svg>,
  Eye: () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.6} strokeLinecap="round"><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" /></Svg>,
};

// ─── Row components ──────────────────────────────────────────────
function ToggleRow({ icon, label, sublabel, value, onToggle, last }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  value: boolean; onToggle: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[st.row, last && { borderBottomWidth: 0 }]}>
      <View style={st.rowIcon}>{icon}</View>
      <View style={st.rowBody}>
        <Text style={st.rowLabel}>{label}</Text>
        {sublabel && <Text style={st.rowSub}>{sublabel}</Text>}
      </View>
      <Switch
        value={value} onValueChange={(v) => { haptics.select(); onToggle(v); }}
        trackColor={{ false: Colors.border, true: Colors.violet }}
        thumbColor="#fff"
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
}

function NavRow({ icon, label, sublabel, right, onPress, last, destructive }: {
  icon: React.ReactNode; label: string; sublabel?: string; right?: string;
  onPress: () => void; last?: boolean; destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
    >
      <View style={st.rowIcon}>{icon}</View>
      <View style={st.rowBody}>
        <Text style={[st.rowLabel, destructive && { color: Colors.error }]}>{label}</Text>
        {sublabel && <Text style={st.rowSub}>{sublabel}</Text>}
      </View>
      {right && <Text style={st.rowRight} numberOfLines={1}>{right}</Text>}
      {!destructive && <IC.Chevron />}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={st.sectionLabel}>{children}</Text>;
}

// ─── Screen ──────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const [usageData, setUsageData] = useState(analyticsOn());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
  }, []);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data, including your hair profile, routines, favourites and chat history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const deleted = await deleteMyAccount();
          if (!deleted) {
            Alert.alert('Could not delete account', 'Please try again, or email support@lumaraelabs.com and we will delete it for you.');
            return;
          }
          await supabase.auth.signOut();
          // Clear the cached hair profile too. Otherwise the next person
          // to sign in on this device sees the previous person's hair.
          const keys = await AsyncStorage.getAllKeys();
          await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('halea_')));
          router.replace('/');
        }},
      ]
    );
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}>
          <IC.Back />
        </Pressable>
        <Text style={st.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <View style={st.card}>
          {/* Sign-in is by emailed code, so there's no password to change. */}
          <View style={[st.row, { borderBottomWidth: 0 }]}>
            <View style={st.rowIcon}><IC.Mail /></View>
            <View style={st.rowBody}>
              <Text style={st.rowLabel}>Email</Text>
              <Text style={st.rowSub} numberOfLines={1}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Hair Profile */}
        <SectionLabel>Hair Profile</SectionLabel>
        <View style={st.card}>
          <NavRow icon={<IC.Eye />} label="View full results" onPress={() => router.push('/reveal')} />
          <NavRow icon={<IC.User />} label="Retake quiz" sublabel="Update your hair profile" onPress={() => router.push('/quiz')} last />
        </View>

        {/* Data & Privacy */}
        <SectionLabel>Data & Privacy</SectionLabel>
        <View style={st.card}>
          <ToggleRow icon={<IC.Eye />} label="Share anonymous usage data" sublabel="Helps us see which features people use. No names, emails or photos." value={usageData} onToggle={v => { setUsageData(v); setAnalyticsOn(v); }} />
          <NavRow icon={<IC.Trash />} label="Delete account" destructive onPress={handleDeleteAccount} last />
        </View>

        <Text style={st.footer}>Halea v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.porcelain },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 44, paddingBottom: 12,
    backgroundColor: Colors.porcelain,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.ink },
  scroll: { paddingBottom: 32 },

  sectionLabel: {
    fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, marginBottom: 8, marginTop: 8,
  },

  card: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon: { width: 24, alignItems: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: Fonts.bodyMedium, fontSize: 16, color: Colors.ink },
  rowSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowRight: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, marginRight: 4, flexShrink: 1, maxWidth: 180, textAlign: 'right' },

  footer: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 20, opacity: 0.4 },
});