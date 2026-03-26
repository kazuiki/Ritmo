import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

type HorizontalAutoScrollTextProps = {
  text: string;
  textStyle: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  speedPxPerSecond?: number;
  edgePauseMs?: number;
  resumeDelayMs?: number;
  showsHorizontalScrollIndicator?: boolean;
};

export default function HorizontalAutoScrollText({
  text,
  textStyle,
  containerStyle,
  contentContainerStyle,
  speedPxPerSecond = 16,
  edgePauseMs = 900,
  resumeDelayMs = 1100,
  showsHorizontalScrollIndicator = false,
}: HorizontalAutoScrollTextProps) {
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const offsetRef = useRef(0);
  const holdUntilRef = useRef(0);
  const isUserInteractingRef = useRef(false);

  const maxOffset = useMemo(() => {
    return Math.max(0, contentWidth - containerWidth);
  }, [containerWidth, contentWidth]);

  const clearAutoScrollTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  const stopInteractionAndResume = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, resumeDelayMs);
  };

  useEffect(() => {
    offsetRef.current = 0;
    holdUntilRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [text]);

  useEffect(() => {
    clearAutoScrollTimers();

    if (maxOffset <= 1) return () => clearAutoScrollTimers();

    const stepMs = 40;
    const stepPx = (speedPxPerSecond * stepMs) / 1000;

    intervalRef.current = setInterval(() => {
      if (isUserInteractingRef.current) return;

      const now = Date.now();
      if (now < holdUntilRef.current) return;

      let next = offsetRef.current + stepPx;

      if (next >= maxOffset) {
        next = maxOffset;
        offsetRef.current = next;
        scrollRef.current?.scrollTo({ x: next, animated: false });
        // Pause at end, then reset to start
        holdUntilRef.current = now + edgePauseMs;
        setTimeout(() => {
          if (!isUserInteractingRef.current) {
            offsetRef.current = 0;
            scrollRef.current?.scrollTo({ x: 0, animated: false });
            holdUntilRef.current = Date.now() + edgePauseMs;
          }
        }, edgePauseMs);
      } else {
        offsetRef.current = next;
        scrollRef.current?.scrollTo({ x: next, animated: false });
      }
    }, stepMs);

    return () => clearAutoScrollTimers();
  }, [maxOffset, speedPxPerSecond, edgePauseMs]);

  useEffect(() => {
    return () => clearAutoScrollTimers();
  }, []);

  return (
    <View style={containerStyle} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
        onScroll={(e) => {
          offsetRef.current = e.nativeEvent.contentOffset.x;
        }}
        onTouchStart={() => {
          isUserInteractingRef.current = true;
          if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        }}
        onTouchEnd={stopInteractionAndResume}
        onMomentumScrollEnd={stopInteractionAndResume}
        onContentSizeChange={(w) => setContentWidth(w)}
      >
        <Text
          style={textStyle}
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {text}
        </Text>
      </ScrollView>
    </View>
  );
}
