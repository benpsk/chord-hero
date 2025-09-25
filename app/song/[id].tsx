import React, { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton, Text, useTheme, SegmentedButtons, Chip, Portal, Surface, Divider } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { getSongById } from '@/constants/songs';
import { ChordProView } from '@/components/ChordProView';
import { extractMeta, toDisplayLines, transposeChordPro, transposeChordToken } from '@/lib/chord';
import SongHeaderTitle from '@/components/SongHeaderTitle';

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const song = getSongById(String(id));
  const theme = useTheme();
  const nav = useNavigation();
  const [transpose, setTranspose] = useState(0);
  const [mode, setMode] = useState<'inline' | 'over' | 'lyrics'>('over');
  const [fontSize, setFontSize] = useState(16);
  const [overGap, setOverGap] = useState(2);
  const [lineGap, setLineGap] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [peekVisible, setPeekVisible] = useState(true);
  const peekOpacity = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown
  const dragY = useRef(new Animated.Value(0)).current; // gesture-driven translate
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hidePeek = useCallback(() => {
    Animated.timing(peekOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPeekVisible(false);
    });
  }, [peekOpacity]);

  const showPeek = useCallback(() => {
    if (!peekVisible) setPeekVisible(true);
    Animated.timing(peekOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [peekOpacity, peekVisible]);

  const scheduleHide = useCallback((delay = 2500) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hidePeek(), delay);
  }, [hidePeek]);

  const openControls = useCallback(() => {
    Haptics.selectionAsync();
    setControlsOpen(true);
    // Keep peek hidden when controls are open
    setPeekVisible(false);
    peekOpacity.setValue(0);
    dragY.setValue(0);
    Animated.timing(sheetAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [dragY, peekOpacity, sheetAnim]);
  const closeControls = useCallback(() => {
    Haptics.selectionAsync();
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
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
            Animated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
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
        <IconButton
          icon="tune"
          size={22}
          onPress={openControls}
          accessibilityLabel="Open display and transpose controls"
          iconColor={theme.colors.onSurface}
          style={{ marginRight: 12 }}
        />
      ),
    });
  }, [nav, song, singer, composer, openControls, theme]);

  if (!song) {
    return (
      <View style={styles.center}> 
        <Text>Song not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={() => {
          if (!controlsOpen) {
            showPeek();
            scheduleHide();
          }
        }}
        scrollEventThrottle={32}
      >
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
            mode={mode}
            fontSize={fontSize}
            overGap={overGap}
            lineGap={lineGap}
          />
        </Pressable>
      </ScrollView>

      {/* Peek handle for swipe-up to open controls without occupying space */}
      {peekVisible && !controlsOpen ? (
      <Pressable
        accessibilityLabel="Show controls"
        onPress={openControls}
        style={styles.peekTouchable}
        {...peekPan.panHandlers}
      >
        <Animated.View style={{ opacity: peekOpacity }}>
          <View style={[styles.peekHandle, { backgroundColor: theme.colors.outline }]} />
        </Animated.View>
      </Pressable>
      ) : null}

      <Portal>
        {controlsOpen ? (
          <>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) },
              ]}
            >
              <Pressable style={{ flex: 1 }} onPress={closeControls} accessibilityLabel="Dismiss controls" />
            </Animated.View>
            <Animated.View
              style={[
                styles.bottomSheet,
                { transform: [{ translateY: Animated.add(sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }), dragY) }] },
              ]}
              {...sheetPan.panHandlers}
            >
          <Surface style={[styles.sheet, { backgroundColor: theme.colors.elevation.level3 }] } elevation={2}>
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
            </Animated.View>
          </>
        ) : null}
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 96, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    backgroundColor: 'rgba(127,127,127,0.5)',
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
