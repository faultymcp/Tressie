// components/PhotoCarousel.tsx
// Swipe sideways through a stylist's photos, with small dots showing where
// you are (active dot is lime — the "you are here" colour, same as the nav).

import { useState } from 'react';
import { View, Image, FlatList, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

type Props = {
  photos: string[];
  width: number;
  height: number;
  radius?: number;
};

export function PhotoCarousel({ photos, width, height, radius = 22 }: Props) {
  const [page, setPage] = useState(0);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <FlatList
        data={photos}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
        )}
      />
      {photos.length > 1 ? (
        <View style={st.dots} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={[st.dot, i === page && st.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { backgroundColor: '#D9FF00', width: 16 },
});
