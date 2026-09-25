// components/MasonryFeed.tsx
// Pinterest-style masonry feed.
//
// CORRECTED: @shopify/flash-list v2 (what's actually installed — 2.0.2) removed
// MasonryFlashList entirely. Masonry is now a boolean `masonry` prop on plain
// FlashList, and estimatedItemSize is no longer read at all in v2. The earlier
// version of this file used the v1 API from memory without checking it against
// the installed version — that's what crashed. Verified against the real
// v2 docs before writing this.

import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Surface,
  Foreground,
  BorderTone,
  Radius,
  Spacing,
  Type,
  Motion,
  Shadows,
} from '@/constants/theme';

export type FeedItem = {
  id: string;
  imageUrl: string;
  title: string;
  byline?: string;
  aspectRatio?: number; // height/width — vary per item for the masonry look
};

type Props = {
  data: FeedItem[];
  onPressItem?: (item: FeedItem) => void;
  scrollEnabled?: boolean;
};

export function MasonryFeed({ data, onPressItem, scrollEnabled = true }: Props) {
  return (
    <FlashList
      data={data}
      masonry
      numColumns={2}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={styles.content}
      renderItem={({ item, index }: { item: FeedItem; index: number }) => (
        <Animated.View
          entering={FadeInDown.duration(Motion.medium).delay(Math.min(index, 6) * 20)}
          style={styles.cardWrap}
        >
          <FeedCard item={item} onPress={() => onPressItem?.(item)} />
        </Animated.View>
      )}
    />
  );
}

function FeedCard({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const height = 160 * (item.aspectRatio ?? 1);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, Shadows.card]}>
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.();
        }}
        onPressIn={() => { scale.value = withSpring(0.97, Motion.springTight); }}
        onPressOut={() => { scale.value = withSpring(1, Motion.springCalm); }}
      >
        <Image source={{ uri: item.imageUrl }} style={[styles.photo, { height }]} resizeMode="cover" />
        <View style={styles.cap}>
          <Text style={[Type.headline, styles.title]} numberOfLines={2}>{item.title}</Text>
          {item.byline ? <Text style={Type.caption}>{item.byline}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  cardWrap: { paddingHorizontal: Spacing.sm / 2, paddingBottom: Spacing.md },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: BorderTone.base,
    backgroundColor: Surface.raised,
    overflow: 'hidden',
  },
  photo: { width: '100%' },
  cap: { padding: Spacing.md },
  title: { marginBottom: 2 },
});
