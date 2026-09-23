// components/MasonryFeed.tsx
// Pinterest-style masonry feed. New dependency:
//   npx expo install @shopify/flash-list
// Built to match components/primitives/Button.tsx's existing conventions —
// same semantic tokens, same press-spring values, Reanimated FadeInDown for
// entrance (Motion.medium, no bounce, per the theme's own motion rule).

import React from 'react';
import { MasonryFlashList } from '@shopify/flash-list';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
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
};

export function MasonryFeed({ data, onPressItem }: Props) {
  return (
    <MasonryFlashList
      data={data}
      numColumns={2}
      estimatedItemSize={220}
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
        onPress={onPress}
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
