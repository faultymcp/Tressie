// app/(tabs)/_layout.tsx
// Floating glass tab bar (Oct 10 reset).
//   - Real glass on both platforms. iPhone uses the system blur. Android needs
//     its blur switched on AND told what to blur: the whole navigator is wrapped
//     in a BlurTargetView, and the bar's BlurView blurs that target.
//   - One quiet "you are here" signal: a soft lavender pill behind the active
//     tab. No dots, no glow.
//   - Normal-case labels, one font, no letter-spacing, so nothing wraps.

import { useRef, type ReactElement, type RefObject } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView, BlurTargetView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const IDLE = 'rgba(255,254,247,0.55)';
const ACTIVE = '#FFFEF7';

// ─── Icons (one stroke weight, one size) ──────────────────────────
const icon = (color: string, children: React.ReactNode) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const IconHome = ({ color }: { color: string }) => icon(color, <Path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2z" />);
const IconDiscover = ({ color }: { color: string }) => icon(color, <><Circle cx="11" cy="11" r="7.5" /><Path d="M21 21l-4.3-4.3" /></>);
const IconShop = ({ color }: { color: string }) => icon(color, <><Path d="M6 8h12l-1 12H7L6 8z" /><Path d="M9 8V6a3 3 0 016 0v2" /></>);
const IconMe = ({ color }: { color: string }) => icon(color, <><Circle cx="12" cy="8" r="4" /><Path d="M4 21v-1a8 8 0 0116 0v1" /></>);
// Halea: the halo ring from the app icon
const IconHalea = ({ color }: { color: string }) => icon(color, <><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="2.2" fill={color} stroke="none" /></>);

function TabItem({ focused, label, Icon }: { focused: boolean; label: string; Icon: (p: { color: string }) => ReactElement }) {
  const color = focused ? ACTIVE : IDLE;
  return (
    <View style={[styles.item, focused && styles.itemActive]}>
      <Icon color={color} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

// Glass: system blur + a thin tint so the bar reads on any background
function GlassBackground({ target }: { target: RefObject<View | null> }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        tint="dark"
        intensity={Platform.OS === 'ios' ? 45 : 60}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={target}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
    </View>
  );
}

const haptic = () => { Haptics.selectionAsync().catch(() => {}); };

export default function TabLayout() {
  const blurTarget = useRef<View | null>(null);

  const tab = (label: string, Icon: (p: { color: string }) => ReactElement) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) => <TabItem focused={focused} label={label} Icon={Icon} />,
    tabBarLabel: () => null,
  });

  return (
    <Tabs
      layout={({ children }) => (
        <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
          {children}
        </BlurTargetView>
      )}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <GlassBackground target={blurTarget} />,
        tabBarIconStyle: styles.iconSlot,
        tabBarItemStyle: styles.tabSlot,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="home" listeners={{ tabPress: haptic }} options={tab('Home', IconHome)} />
      <Tabs.Screen name="discover" listeners={{ tabPress: haptic }} options={tab('Discover', IconDiscover)} />
      <Tabs.Screen name="ai-chat" listeners={{ tabPress: haptic }} options={tab('Halea', IconHalea)} />
      <Tabs.Screen name="products" listeners={{ tabPress: haptic }} options={tab('Shop', IconShop)} />
      <Tabs.Screen name="profile" listeners={{ tabPress: haptic }} options={tab('Me', IconMe)} />
      {/* Not in the bar, still reachable from other screens */}
      <Tabs.Screen name="salons" options={{ href: null }} />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 28 : 16,
    height: 68,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: 34,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
  },
  glassTint: {
    backgroundColor: 'rgba(26,16,56,0.38)',
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tabSlot: {
    height: 68,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSlot: {
    width: 62,
    height: 54,
  },
  item: {
    width: 62,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    backgroundColor: 'rgba(195,140,217,0.22)',
  },
  label: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
  },
});
