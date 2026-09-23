// components/RiveReveal.tsx
// Wraps the quiz-completion Rive animation. New dependency:
//   npx expo install rive-react-native
// The .riv FILE isn't something I can generate — export it from the Rive
// editor and drop it at assets/quiz_complete.riv. This is a new moment,
// separate from app/reveal.tsx (the curl-type result screen) — wire it in
// wherever the "your routine is ready" beat actually happens in the quiz flow.

import React, { useRef } from 'react';
import Rive, { RiveRef } from 'rive-react-native';
import { View, StyleSheet } from 'react-native';

type Props = {
  onComplete?: () => void;
};

export function RiveReveal({ onComplete }: Props) {
  const riveRef = useRef<RiveRef>(null);

  return (
    <View style={styles.wrap}>
      <Rive
        ref={riveRef}
        resourceName="quiz_complete" // matches assets/quiz_complete.riv
        autoplay
        stateMachineName="State Machine 1" // rename to match your Rive file
        onStop={onComplete}
        style={styles.rive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 1 },
  rive: { width: '100%', height: '100%' },
});
