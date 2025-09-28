import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleProp, Text, TextStyle, View } from 'react-native';

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  speed?: number; // px per second
  pauseBefore?: number; // ms pause before start
  pauseBetween?: number; // ms pause at ends
  numberOfLines?: number;
};

// Simple back-and-forth marquee for overflowing text.
export const MarqueeText: React.FC<Props> = ({
  text,
  style,
  speed = 50,
  pauseBefore = 600,
  pauseBetween = 400,
  numberOfLines = 1,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // stop previous animation on updates
    if (animRef.current) {
      animRef.current.stop();
      translateX.setValue(0);
    }

    const overflow = textWidth - containerWidth;
    if (overflow > 6) {
      const duration = Math.max(1, overflow) / Math.max(1, speed) * 1000;
      const sequence = Animated.sequence([
        Animated.delay(pauseBefore),
        Animated.timing(translateX, { toValue: -overflow, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(pauseBetween),
        Animated.timing(translateX, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: true }),
      ]);
      const loop = Animated.loop(sequence, { resetBeforeIteration: true });
      animRef.current = loop;
      loop.start();
      return () => loop.stop();
    }
    return () => {};
  }, [containerWidth, textWidth, speed, pauseBefore, pauseBetween, translateX]);

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  const onTextLayout = (e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width);

  const shouldAnimate = useMemo(() => textWidth > containerWidth + 6, [textWidth, containerWidth]);

  return (
    <View onLayout={onContainerLayout} style={{ overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Text onLayout={onTextLayout} numberOfLines={numberOfLines} style={style}>
          {text}
        </Text>
      </Animated.View>
      {/* If we clamp to one line, ensure measurement reflects full width */}
      {!shouldAnimate ? null : null}
    </View>
  );
};

export default MarqueeText;

