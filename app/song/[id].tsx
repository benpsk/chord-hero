import React, { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  Animated as RNAnimated,
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  IconButton,
  Modal,
  Text,
  useTheme,
  SegmentedButtons,
  Chip,
  Portal,
  Surface,
  Divider,
  Switch,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { getSongById } from '@/constants/songs';
import { ChordProView } from '@/components/ChordProView';
import { extractMeta, toDisplayLines, transposeChordPro, transposeChordToken } from '@/lib/chord';
import SongHeaderTitle from '@/components/SongHeaderTitle';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = getSongById(String(id));
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];
  const nav = useNavigation();
  const [transpose, setTranspose] = useState(0);
  const [mode, setMode] = useState<'inline' | 'over' | 'lyrics'>('over');
  const [fontSize, setFontSize] = useState(16);
  const [overGap, setOverGap] = useState(2);
  const [lineGap, setLineGap] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(30);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideDifficulty, setGuideDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [peekVisible, setPeekVisible] = useState(true);
  const peekOpacity = useRef(new RNAnimated.Value(0)).current;
  const sheetAnim = useRef(new RNAnimated.Value(0)).current; // 0 hidden, 1 shown
  const dragY = useRef(new RNAnimated.Value(0)).current; // gesture-driven translate
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const contentHeightRef = useRef(0);
  const containerHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollEnabledRef = useRef(autoScrollEnabled);
  const autoScrollSpeedRef = useRef(autoScrollSpeed);
  const userInteractingRef = useRef(false);

  const hidePeek = useCallback(() => {
    RNAnimated.timing(peekOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPeekVisible(false);
    });
  }, [peekOpacity]);

  const showPeek = useCallback(() => {
    if (!peekVisible) setPeekVisible(true);
    RNAnimated.timing(peekOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [peekOpacity, peekVisible]);

  const scheduleHide = useCallback((delay = 2500) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hidePeek(), delay);
  }, [hidePeek]);

  const openGuide = useCallback(() => {
    setGuideVisible(true);
  }, []);

  const closeGuide = useCallback(() => {
    setGuideVisible(false);
  }, []);

  const handleGuideDifficultyChange = useCallback((value: string) => {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      setGuideDifficulty(value);
    }
  }, []);

  const handleGuideSubmit = useCallback(() => {
    setGuideVisible(false);
  }, []);

  const clearAutoScrollTimer = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const computeAutoScrollDelay = useCallback(
    (speed: number) => {
      const clamped = Math.min(MAX_SCROLL_SPEED, Math.max(MIN_SCROLL_SPEED, speed));
      const ratio = (clamped - MIN_SCROLL_SPEED) / (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED);
      const delay =
        AUTOSCROLL_MAX_DELAY_MS - ratio * (AUTOSCROLL_MAX_DELAY_MS - AUTOSCROLL_MIN_DELAY_MS);
      return Math.max(AUTOSCROLL_MIN_DELAY_MS, Math.round(delay));
    },
    []
  );

  const runAutoScrollTick = useCallback(() => {
    clearAutoScrollTimer();

    if (!autoScrollEnabledRef.current) {
      return;
    }

    const scheduleNext = () => {
      const delay = computeAutoScrollDelay(autoScrollSpeedRef.current);
      autoScrollTimerRef.current = setTimeout(() => {
        runAutoScrollTick();
      }, delay);
    };

    if (userInteractingRef.current) {
      scheduleNext();
      return;
    }

    const maxOffset = Math.max(0, contentHeightRef.current - containerHeightRef.current);
    if (maxOffset <= 0) {
      scheduleNext();
      return;
    }

    const nextOffset = Math.min(maxOffset, scrollOffsetRef.current + AUTOSCROLL_STEP_PX);
    scrollViewRef.current?.scrollTo({ y: nextOffset, animated: true });
    scrollOffsetRef.current = nextOffset;

    if (nextOffset >= maxOffset) {
      autoScrollTimerRef.current = null;
      return;
    }

    scheduleNext();
  }, [clearAutoScrollTimer, computeAutoScrollDelay]);

  const ensureAutoScrollTimer = useCallback(() => {
    if (!autoScrollEnabledRef.current || autoScrollTimerRef.current) {
      return;
    }
    const delay = computeAutoScrollDelay(autoScrollSpeedRef.current);
    autoScrollTimerRef.current = setTimeout(() => {
      runAutoScrollTick();
    }, delay);
  }, [computeAutoScrollDelay, runAutoScrollTick]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      if (!controlsOpen && !autoScrollEnabledRef.current) {
        showPeek();
        scheduleHide();
      }
    },
    [controlsOpen, scheduleHide, showPeek]
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height;
      ensureAutoScrollTimer();
    },
    [ensureAutoScrollTimer]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      containerHeightRef.current = event.nativeEvent.layout.height;
      ensureAutoScrollTimer();
    },
    [ensureAutoScrollTimer]
  );

  const handleScrollBeginDrag = useCallback(() => {
    userInteractingRef.current = true;
    clearAutoScrollTimer();
  }, [clearAutoScrollTimer]);

  const handleScrollEndDrag = useCallback(() => {
    userInteractingRef.current = false;
    ensureAutoScrollTimer();
  }, [ensureAutoScrollTimer]);

  const handleMomentumScrollEnd = useCallback(() => {
    userInteractingRef.current = false;
    ensureAutoScrollTimer();
  }, [ensureAutoScrollTimer]);

  useEffect(() => {
    autoScrollSpeedRef.current = autoScrollSpeed;
    if (autoScrollEnabledRef.current) {
      clearAutoScrollTimer();
      ensureAutoScrollTimer();
    }
  }, [autoScrollSpeed, clearAutoScrollTimer, ensureAutoScrollTimer]);

  useEffect(() => {
    autoScrollEnabledRef.current = autoScrollEnabled;
    if (autoScrollEnabled) {
      ensureAutoScrollTimer();
    } else {
      clearAutoScrollTimer();
    }
  }, [autoScrollEnabled, clearAutoScrollTimer, ensureAutoScrollTimer]);

  useEffect(() => () => {
    clearAutoScrollTimer();
  }, [clearAutoScrollTimer]);

  const openControls = useCallback(() => {
    Haptics.selectionAsync();
    setControlsOpen(true);
    // Keep peek hidden when controls are open
    setPeekVisible(false);
    peekOpacity.setValue(0);
    dragY.setValue(0);
    RNAnimated.timing(sheetAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [dragY, peekOpacity, sheetAnim]);
  const closeControls = useCallback(() => {
    Haptics.selectionAsync();
    RNAnimated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      dragY.setValue(0);
      setControlsOpen(false);
      // Briefly show peek after closing, then hide
      showPeek();
      scheduleHide();
    });
  }, [dragY, scheduleHide, sheetAnim, showPeek]);

  const peekPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 6,
        onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
          if (gs.dy < -20) {
            openControls();
          }
        },
      }),
    [openControls]
  );

  const sheetPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 4,
        onPanResponderMove: (_e, gs) => {
          const y = Math.max(0, gs.dy);
          dragY.setValue(y);
        },
        onPanResponderRelease: (_e, gs) => {
          const shouldClose = gs.dy > 120 || gs.vy > 1.0;
          if (shouldClose) {
            closeControls();
          } else {
            RNAnimated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
          }
        },
      }),
    [closeControls, dragY]
  );

  useEffect(() => {
    // Initial auto-hide of peek handle
    showPeek();
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [scheduleHide, showPeek]);

  const MIN_TRANSPOSE = -11;
  const MAX_TRANSPOSE = 11;
  const MIN_FONT = 12;
  const MAX_FONT = 28;
  const MIN_LINE_GAP = -8;
  const MAX_LINE_GAP = 24;
  const MIN_OVER_GAP = -8;
  const MAX_OVER_GAP = 16;
  const MIN_SCROLL_SPEED = 1;
  const MAX_SCROLL_SPEED = 100;
  const AUTOSCROLL_STEP_PX = 48;
  const AUTOSCROLL_MIN_DELAY_MS = 400;
  const AUTOSCROLL_MAX_DELAY_MS = 4000;

  const transposedBody = useMemo(() => {
    return song ? transposeChordPro(song.body, transpose) : '';
  }, [song, transpose]);

  const lines = useMemo(() => toDisplayLines(transposedBody), [transposedBody]);
  const meta = useMemo(() => (song ? extractMeta(song.body) : {}), [song]);
  const metaKeyRaw = (meta as any).key as string | undefined;
  const bodyKey = useMemo(() => extractKeyFromBody(song?.body), [song?.body]);
  const songKey = useMemo(() => normalizeKeyValue(song?.key), [song?.key]);
  const metaKey = useMemo(() => normalizeKeyValue(metaKeyRaw), [metaKeyRaw]);
  const baseKey = songKey ?? metaKey ?? bodyKey;
  const effectiveKey = useMemo(() => (baseKey ? transposeChordToken(baseKey, transpose) : undefined), [baseKey, transpose]);
  const singer = song?.artist || (meta as any).artist;
  const composer = song?.composer || ((meta as any).composer as string | undefined);
  useLayoutEffect(() => {
    if (!song) return;
    nav.setOptions({
      headerTitle: () => (
        <SongHeaderTitle title={song.title} singer={singer} composer={composer} />
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            icon="help-circle-outline"
            size={22}
            onPress={openGuide}
            accessibilityLabel="Open guide"
            iconColor={theme.colors.onSurface}
          />
          <IconButton
            icon="tune"
            size={22}
            onPress={openControls}
            accessibilityLabel="Open display and transpose controls"
            iconColor={theme.colors.onSurface}
            style={{ marginRight: 12 }}
          />
        </View>
      ),
      headerBackTitleVisible: false,
      headerTitleAlign: 'left',
      headerTitleContainerStyle: { marginLeft: -12 },
      headerLeftContainerStyle: { marginLeft: 0 },
    });
  }, [nav, song, singer, composer, openControls, openGuide, theme]);

  if (!song) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.center, { backgroundColor: palette.background }]}> 
          <Text style={{ color: palette.text }}>Song not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: palette.background }]}> 
        <Animated.ScrollView
          ref={(ref) => {
            scrollViewRef.current = ref as unknown as ScrollView | null;
          }}
          entering={FadeInUp.duration(360)}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { backgroundColor: palette.background }]}
          onLayout={handleLayout}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(340)}>
            <Pressable
              onPress={(() => {
                let last = 0;
                return () => {
                  const now = Date.now();
                  if (now - last < 300) {
                    openControls();
                    last = 0;
                  } else {
                    last = now;
                  }
                };
              })()}
            >
              <ChordProView
                lines={lines}
                chordColor={theme.colors.primary}
                lyricColor={palette.text}
                mode={mode}
                fontSize={fontSize}
                overGap={overGap}
                lineGap={lineGap}
              />
            </Pressable>
          </Animated.View>
        </Animated.ScrollView>

        {/* Peek handle for swipe-up to open controls without occupying space */}
        {peekVisible && !controlsOpen ? (
          <Pressable
            accessibilityLabel="Show controls"
            onPress={openControls}
            style={styles.peekTouchable}
            {...peekPan.panHandlers}
          >
            <RNAnimated.View style={{ opacity: peekOpacity }}>
              <View style={[styles.peekHandle, { backgroundColor: theme.colors.outline }]} />
            </RNAnimated.View>
          </Pressable>
        ) : null}

      <Portal>
        <Modal
          visible={guideVisible}
          onDismiss={closeGuide}
          contentContainerStyle={styles.guideModalContainer}
        >
          <Surface style={[styles.guideSurface, { backgroundColor: theme.colors.elevation.level2 }]}
            elevation={2}
          >
            <View style={styles.guideHeader}>
              <Text variant="titleMedium">Performance Tips</Text>
              <IconButton icon="close" onPress={closeGuide} accessibilityLabel="Close guide" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.guideCarousel}
            >
              {[...Array(6).keys()].map((index) => (
                <View
                  key={`guide-card-${index}`}
                  style={[styles.guidePlaceholder, { backgroundColor: theme.colors.secondaryContainer }]} 
                />
              ))}
            </ScrollView>
            <View style={styles.guideDifficultySection}>
              <Text variant="titleSmall">Difficulty Level</Text>
              <SegmentedButtons
                value={guideDifficulty}
                onValueChange={handleGuideDifficultyChange}
                buttons={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </View>
            <View style={styles.guideActions}>
              <Button mode="contained" onPress={handleGuideSubmit} accessibilityLabel="Submit difficulty">
                Submit
              </Button>
            </View>
          </Surface>
        </Modal>

        {controlsOpen ? (
          <>
            <RNAnimated.View
              style={[
                styles.backdrop,
                { opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) },
              ]}
            >
              <Pressable style={{ flex: 1 }} onPress={closeControls} accessibilityLabel="Dismiss controls" />
            </RNAnimated.View>
            <RNAnimated.View
              style={[
                styles.bottomSheet,
                { transform: [{ translateY: RNAnimated.add(sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }), dragY) }] },
              ]}
              {...sheetPan.panHandlers}
            >
              <Surface style={[styles.sheet, { backgroundColor: theme.colors.elevation.level3 }]} elevation={2}>
            <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 2 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant }} />
            </View>
            <View style={styles.sheetHeader}>
              <Text variant="titleMedium">Display & Transpose</Text>
              <Chip compact>
                {baseKey ? (transpose !== 0 ? `Key: ${baseKey} → ${effectiveKey}` : `Key: ${baseKey}`) : 'Key: —'}
              </Chip>
              <View style={{ flex: 1 }} />
              <IconButton icon="close" onPress={closeControls} accessibilityLabel="Close" />
            </View>
            <Divider />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Mode</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ alignSelf: 'flex-end' }}>
                  <SegmentedButtons
                    density="small"
                    value={mode}
                    onValueChange={(v) => {
                      Haptics.selectionAsync();
                      setMode(v as any);
                    }}
                    buttons={[
                      { value: 'inline', label: 'Inline' },
                      { value: 'over', label: 'Over' },
                      { value: 'lyrics', label: 'Lyrics' },
                    ]}
                  />
                </ScrollView>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Transpose</Text>
              <View style={styles.group}>
                <IconButton icon="minus" mode="contained-tonal" size={20} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTranspose((t) => Math.max(MIN_TRANSPOSE, t - 1)); }} disabled={transpose <= MIN_TRANSPOSE} accessibilityLabel="Transpose down" />
                <Chip compact elevated>{transpose >= 0 ? `+${transpose}` : `${transpose}`}</Chip>
                <IconButton icon="plus" mode="contained-tonal" size={20} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTranspose((t) => Math.min(MAX_TRANSPOSE, t + 1)); }} disabled={transpose >= MAX_TRANSPOSE} accessibilityLabel="Transpose up" />
            </View>
          </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Font Size</Text>
              <View style={styles.group}>
                <IconButton icon="format-font-size-decrease" size={20} onPress={() => { Haptics.selectionAsync(); setFontSize((s) => Math.max(MIN_FONT, s - 2)); }} disabled={fontSize <= MIN_FONT} accessibilityLabel="Decrease text size" />
                <Chip compact>{fontSize}pt</Chip>
                <IconButton icon="format-font-size-increase" size={20} onPress={() => { Haptics.selectionAsync(); setFontSize((s) => Math.min(MAX_FONT, s + 2)); }} disabled={fontSize >= MAX_FONT} accessibilityLabel="Increase text size" />
            </View>
          </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Auto Scroll</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={styles.autoScrollControls}>
                  <Switch
                    value={autoScrollEnabled}
                    onValueChange={(value) => {
                      Haptics.selectionAsync();
                      setAutoScrollEnabled(value);
                    }}
                    accessibilityLabel="Toggle auto scroll"
                  />
                  <IconButton
                    icon="minus"
                    mode="contained-tonal"
                    size={20}
                    disabled={autoScrollEnabled || autoScrollSpeed <= MIN_SCROLL_SPEED}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAutoScrollSpeed((speed) => Math.max(MIN_SCROLL_SPEED, speed - 1));
                    }}
                    accessibilityLabel="Decrease auto scroll speed"
                  />
                  <Chip compact elevated>{`${autoScrollSpeed}%`}</Chip>
                  <IconButton
                    icon="plus"
                    mode="contained-tonal"
                    size={20}
                    disabled={autoScrollEnabled || autoScrollSpeed >= MAX_SCROLL_SPEED}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAutoScrollSpeed((speed) => Math.min(MAX_SCROLL_SPEED, speed + 1));
                    }}
                    accessibilityLabel="Increase auto scroll speed"
                  />
                </View>
              </View>
            </View>

            {mode === 'inline' ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Line Spacing</Text>
                <View style={styles.group}>
            <IconButton icon="chevron-down" size={20} onPress={() => { Haptics.selectionAsync(); setLineGap((g) => Math.max(MIN_LINE_GAP, g - 2)); }} disabled={lineGap <= MIN_LINE_GAP} accessibilityLabel="Reduce line spacing" />
            <Chip compact>{lineGap}px</Chip>
            <IconButton icon="chevron-up" size={20} onPress={() => { Haptics.selectionAsync(); setLineGap((g) => Math.min(MAX_LINE_GAP, g + 2)); }} disabled={lineGap >= MAX_LINE_GAP} accessibilityLabel="Increase line spacing" />
                </View>
              </View>
            ) : null}

            {mode === 'over' ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Chord/Lyric Gap</Text>
                <View style={styles.group}>
                  <IconButton icon="chevron-down" size={20} onPress={() => { Haptics.selectionAsync(); setOverGap((g) => Math.max(MIN_OVER_GAP, g - 2)); }} disabled={overGap <= MIN_OVER_GAP} accessibilityLabel="Reduce chord/lyric gap" />
                  <Chip compact>{overGap}px</Chip>
                  <IconButton icon="chevron-up" size={20} onPress={() => { Haptics.selectionAsync(); setOverGap((g) => Math.min(MAX_OVER_GAP, g + 2)); }} disabled={overGap >= MAX_OVER_GAP} accessibilityLabel="Increase chord/lyric gap" />
                </View>
              </View>
            ) : null}
              </Surface>
            </RNAnimated.View>
          </>
        ) : null}
      </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 96, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoScrollControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideModalContainer: {
    marginHorizontal: 24,
  },
  guideSurface: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideCarousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  guidePlaceholder: {
    width: 40,
    height: 60,
    borderRadius: 12,
  },
  guideDifficultySection: {
    gap: 12,
  },
  guideActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  peekTouchable: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 64,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalRoot: {
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
    alignSelf: 'stretch',
  },
  sheet: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  rowLabel: {
    width: 120,
  },
});

function normalizeKeyValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\[|\]/g, '').trim();
  if (!cleaned) return undefined;
  const token = cleaned.split(/\s+/)[0];
  return token || undefined;
}

function extractKeyFromBody(body?: string | null): string | undefined {
  if (!body) return undefined;
  const lines = body.split(/\r?\n/);
  for (const raw of lines) {
    if (/^\s*key\s*:/i.test(raw)) {
      const value = raw.split(':').slice(1).join(':');
      return normalizeKeyValue(value);
    }
  }
  return undefined;
}
