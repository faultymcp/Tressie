// app/(tabs)/_layout.tsx
//
// Glass pill tab bar, floating above the halo.
//   - Glass: translucent fill + real blur + light edge. It reads as glass
//     because the halo light sits behind it.
//   - One "you are here" signal: icon and label turn cream, and a lime dot
//     sits in its own space UNDER the label. No glow capsule.
//   - The Halea tab is a small point of light (matches the chat screen's
//     radiant core). It has a label like every other tab, so all five sit
//     on the same baseline — the old raised gradient button is gone, which
//     is what kept knocking the alignment off.

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

const IDLE = 'rgba(255,254,247,0.45)';
const ACTIVE = '#FFFEF7';

// ─── Icons ────────────────────────────────────────────────────────
function IconHome({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </Svg>
  );
}
function IconDiscover({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}
function IconSalons({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="6" cy="6" r="3" />
      <Circle cx="6" cy="18" r="3" />
      <Path d="M20 4L8.12 15.88" />
      <Path d="M14.47 14.48L20 20" />
      <Path d="M8.12 8.12L12 12" />
    </Svg>
  );
}
function IconProfile({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}
function IconProducts({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 8h12l-1 12H7L6 8z" />
      <Path d="M9 8V6a3 3 0 016 0v2" />
    </Svg>
  );
}
// A point of light with a soft cross glint — Halea's mark.
function IconHalea({ focused }: { focused: boolean }) {
  const o = focused ? 1 : 0.6;
  return (
    <Svg width={26} height={26} viewBox="0 0 30 30">
      <Defs>
        <RadialGradient id="tabcore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={o} />
          <Stop offset="35%" stopColor="#E6BEF5" stopOpacity={0.8 * o} />
          <Stop offset="100%" stopColor="#C38CD9" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="15" cy="15" r="14" fill="url(#tabcore)" />
      <Rect x="3" y="14.4" width="24" height="1.2" rx="0.6" fill="#FFFFFF" opacity={0.85 * o} />
      <Rect x="14.4" y="5" width="1.2" height="20" rx="0.6" fill="#FFFFFF" opacity={0.85 * o} />
    </Svg>
  );
}

// ─── Label + lime dot (the single active indicator) ───────────────
function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
      <View style={[styles.dot, !focused && { opacity: 0 }]} />
    </View>
  );
}

const haptic = () => { Haptics.selectionAsync().catch(() => {}); };

// ─── Glass background ─────────────────────────────────────────────
function GlassBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' ? (
        <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.glassFill]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: IDLE,
        tabBarBackground: () => <GlassBackground />,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        listeners={{ tabPress: haptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconHome color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="HOME" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        listeners={{ tabPress: haptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconDiscover color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="DISCOVER" />,
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        listeners={{ tabPress: haptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconHalea focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="HALEA" />,
        }}
      />
      <Tabs.Screen
        name="products"
        listeners={{ tabPress: haptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconProducts color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="PRODUCTS" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: haptic }}
        options={{
          tabBarIcon: ({ focused }) => <IconProfile color={focused ? ACTIVE : IDLE} />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="ME" />,
        }}
      />
      {/* Salons: still a working screen (Home links here), just not in the bar. */}
      <Tabs.Screen name="salons" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: Platform.OS === 'ios' ? 30 : 18,
    height: 74,
    paddingBottom: 0,
    borderRadius: 999,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
  },
  glassFill: {
    backgroundColor: 'rgba(40,28,80,0.45)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tabItem: {
    paddingTop: 12,
    height: 74,
  },
  labelWrap: {
    alignItems: 'center',
    marginTop: 3,
  },
  label: {
    fontFamily: 'Sora_500Medium',
    fontSize: 9,
    letterSpacing: 1.2,
    color: IDLE,
  },
  labelActive: {
    fontFamily: 'Sora_600SemiBold',
    color: ACTIVE,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.lime,
    marginTop: 4,
  },
});
