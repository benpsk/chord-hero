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
import { IconButton, Text, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ChordProView } from '@/components/ChordProView';
import { LoginRequiredDialog } from '@/components/auth/LoginRequiredDialog';
import { getChordByName } from '@/constants/chords';
import { extractMeta, toDisplayLines, transposeChordPro, transposeChordToken } from '@/lib/chord';
import SongHeaderTitle from '@/components/SongHeaderTitle';
import { SongRecord } from '@/hooks/useSongsSearch';
import { useAuth } from '@/hooks/useAuth';
import { ChordModal, type ChordModalState } from './ChordModal';
import { GuideModal } from './GuideModal';
import { ControlsSheet } from './ControlsSheet';
import { ControlsPeek } from './ControlsPeek';
import { extractKeyFromBody, normalizeKeyValue } from './helpers';

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

export function SongDetailScreen() {
  const { item } = useLocalSearchParams<{ id: string; item: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const song: SongRecord = JSON.parse(item);
  const theme = useTheme();
  const nav = useNavigation();
  const [transpose, setTranspose] = useState(0);
  const [mode, setMode] = useState<'inline' | 'over' | 'lyrics'>('over');
  const [fontSize, setFontSize] = useState(14);
  const [overGap, setOverGap] = useState(0);
  const [lineGap, setLineGap] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(30);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideDifficulty, setGuideDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [peekVisible, setPeekVisible] = useState(true);
  const [chordModal, setChordModal] = useState<ChordModalState>(null);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
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
  const lastTapTimestampRef = useRef(0);

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
    if (!isAuthenticated) {
      setLoginPromptVisible(true);
      return;
    }
    setGuideVisible(true);
  }, [isAuthenticated]);

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

  const handleChordPress = useCallback(
    (rawName: string) => {
      const normalized = rawName.trim();
      if (!normalized) return;
      const chord = getChordByName(normalized) ?? getChordByName(normalized.toUpperCase());
      setChordModal({ name: normalized, chord });
    },
    []
  );

  const closeChordModal = useCallback(() => {
    setChordModal(null);
  }, []);

  const handleDismissLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    setLoginPromptVisible(false);
    router.push('/login');
  }, [router]);

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

  const transposedBody = useMemo(() => {
    return song ? transposeChordPro(song.lyric, transpose) : '';
  }, [song, transpose]);

  const lines = useMemo(() => toDisplayLines(transposedBody), [transposedBody]);
  const meta = useMemo(() => (song ? extractMeta(song.lyric) : {}), [song]);
  const metaKeyRaw = (meta as any).key as string | undefined;
  const bodyKey = useMemo(() => extractKeyFromBody(song.lyric), [song.lyric]);
  const songKey = useMemo(() => normalizeKeyValue(song?.key), [song?.key]);
  const metaKey = useMemo(() => normalizeKeyValue(metaKeyRaw), [metaKeyRaw]);
  const baseKey = songKey ?? metaKey ?? bodyKey;
  const effectiveKey = useMemo(() => (baseKey ? transposeChordToken(baseKey, transpose) : undefined), [baseKey, transpose]);
  const singer = song.artists?.map((artist) => artist?.name).filter(Boolean).join(', ') || 'Unknown artist';
  const composer = song.writers?.map((writer) => writer?.name).filter(Boolean).join(', ') || undefined;
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
      headerTitleContainerStyle: { marginLeft: 0 },
      headerLeftContainerStyle: { marginLeft: 0 },
    });
  }, [nav, song, singer, composer, openControls, openGuide, theme]);

  if (!song) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.center, { backgroundColor: theme.colors.background }]}> 
          <Text>Song not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
        <Animated.ScrollView
          ref={(ref) => {
            scrollViewRef.current = ref as unknown as ScrollView | null;
          }}
          entering={FadeInUp.duration(360)}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { backgroundColor: theme.colors.background }]}
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
              onPress={() => {
                const now = Date.now();
                if (now - lastTapTimestampRef.current < 300) {
                  openControls();
                  lastTapTimestampRef.current = 0;
                } else {
                  lastTapTimestampRef.current = now;
                }
              }}
            >
              <ChordProView
                lines={lines}
                chordColor={theme.colors.primary}
                mode={mode}
                fontSize={fontSize}
                overGap={overGap}
                lineGap={lineGap}
                lyricColor={theme.colors.onBackground}
                onChordPress={handleChordPress}
              />
            </Pressable>
          </Animated.View>
        </Animated.ScrollView>

        <ControlsPeek
          visible={peekVisible && !controlsOpen}
          opacity={peekOpacity}
          outlineColor={theme.colors.outline}
          onPress={openControls}
          panHandlers={peekPan.panHandlers}
        />

        <ChordModal data={chordModal} onDismiss={closeChordModal} />

        <GuideModal
          visible={guideVisible}
          difficulty={guideDifficulty}
          onChangeDifficulty={handleGuideDifficultyChange}
          onSubmit={handleGuideSubmit}
          onDismiss={closeGuide}
        />

        <ControlsSheet
          visible={controlsOpen}
          sheetAnim={sheetAnim}
          dragY={dragY}
          sheetPanHandlers={sheetPan.panHandlers}
          onClose={closeControls}
          mode={mode}
          onModeChange={setMode}
          transpose={transpose}
          onTransposeDecrease={() => setTranspose((value) => Math.max(MIN_TRANSPOSE, value - 1))}
          onTransposeIncrease={() => setTranspose((value) => Math.min(MAX_TRANSPOSE, value + 1))}
          canTransposeDown={transpose > MIN_TRANSPOSE}
          canTransposeUp={transpose < MAX_TRANSPOSE}
          fontSize={fontSize}
          onDecreaseFont={() => setFontSize((size) => Math.max(MIN_FONT, size - 2))}
          onIncreaseFont={() => setFontSize((size) => Math.min(MAX_FONT, size + 2))}
          canDecreaseFont={fontSize > MIN_FONT}
          canIncreaseFont={fontSize < MAX_FONT}
          autoScrollEnabled={autoScrollEnabled}
          onToggleAutoScroll={setAutoScrollEnabled}
          autoScrollSpeed={autoScrollSpeed}
          onDecreaseAutoScrollSpeed={() =>
            setAutoScrollSpeed((speed) => Math.max(MIN_SCROLL_SPEED, speed - 1))
          }
          onIncreaseAutoScrollSpeed={() =>
            setAutoScrollSpeed((speed) => Math.min(MAX_SCROLL_SPEED, speed + 1))
          }
          canDecreaseAutoScrollSpeed={!autoScrollEnabled && autoScrollSpeed > MIN_SCROLL_SPEED}
          canIncreaseAutoScrollSpeed={!autoScrollEnabled && autoScrollSpeed < MAX_SCROLL_SPEED}
          baseKey={baseKey}
          effectiveKey={effectiveKey}
          modeConfig={{
            lineGap,
            onDecreaseLineGap: () => setLineGap((gap) => Math.max(MIN_LINE_GAP, gap - 2)),
            onIncreaseLineGap: () => setLineGap((gap) => Math.min(MAX_LINE_GAP, gap + 2)),
            canDecreaseLineGap: lineGap > MIN_LINE_GAP,
            canIncreaseLineGap: lineGap < MAX_LINE_GAP,
            overGap,
            onDecreaseOverGap: () => setOverGap((gap) => Math.max(MIN_OVER_GAP, gap - 2)),
            onIncreaseOverGap: () => setOverGap((gap) => Math.min(MAX_OVER_GAP, gap + 2)),
            canDecreaseOverGap: overGap > MIN_OVER_GAP,
            canIncreaseOverGap: overGap < MAX_OVER_GAP,
          }}
        />
      <LoginRequiredDialog
        visible={loginPromptVisible}
        onDismiss={handleDismissLoginPrompt}
        onLogin={handleNavigateToLogin}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 96,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SongDetailScreen;
