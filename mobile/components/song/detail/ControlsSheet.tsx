import React from 'react';
import { Animated as RNAnimated, PanResponderInstance, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, IconButton, Portal, SegmentedButtons, Surface, Switch, Text, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

type DisplayMode = 'inline' | 'over' | 'lyrics';

type ControlsSheetProps = {
  visible: boolean;
  sheetAnim: RNAnimated.Value;
  dragY: RNAnimated.Value;
  sheetPanHandlers: PanResponderInstance['panHandlers'];
  onClose: () => void;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  transpose: number;
  onTransposeDecrease: () => void;
  onTransposeIncrease: () => void;
  canTransposeDown: boolean;
  canTransposeUp: boolean;
  fontSize: number;
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  canDecreaseFont: boolean;
  canIncreaseFont: boolean;
  autoScrollEnabled: boolean;
  onToggleAutoScroll: (value: boolean) => void;
  autoScrollSpeed: number;
  onDecreaseAutoScrollSpeed: () => void;
  onIncreaseAutoScrollSpeed: () => void;
  canDecreaseAutoScrollSpeed: boolean;
  canIncreaseAutoScrollSpeed: boolean;
  baseKey?: string;
  effectiveKey?: string;
  modeConfig: {
    lineGap: number;
    onDecreaseLineGap: () => void;
    onIncreaseLineGap: () => void;
    canDecreaseLineGap: boolean;
    canIncreaseLineGap: boolean;
    overGap: number;
    onDecreaseOverGap: () => void;
    onIncreaseOverGap: () => void;
    canDecreaseOverGap: boolean;
    canIncreaseOverGap: boolean;
  };
};

export function ControlsSheet({
  visible,
  sheetAnim,
  dragY,
  sheetPanHandlers,
  onClose,
  mode,
  onModeChange,
  transpose,
  onTransposeDecrease,
  onTransposeIncrease,
  canTransposeDown,
  canTransposeUp,
  fontSize,
  onDecreaseFont,
  onIncreaseFont,
  canDecreaseFont,
  canIncreaseFont,
  autoScrollEnabled,
  onToggleAutoScroll,
  autoScrollSpeed,
  onDecreaseAutoScrollSpeed,
  onIncreaseAutoScrollSpeed,
  canDecreaseAutoScrollSpeed,
  canIncreaseAutoScrollSpeed,
  baseKey,
  effectiveKey,
  modeConfig,
}: ControlsSheetProps) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <RNAnimated.View
        style={[
          styles.backdrop,
          { opacity: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) },
        ]}
      >
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Dismiss controls" />
      </RNAnimated.View>

      <RNAnimated.View
        style={[
          styles.sheetContainer,
          {
            transform: [
              {
                translateY: RNAnimated.add(
                  sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }),
                  dragY
                ),
              },
            ],
          },
        ]}
        {...sheetPanHandlers}
      >
        <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level3 }]} elevation={2}>
          <View style={styles.grabberWrapper}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />
          </View>

          <View style={styles.header}>
            <Text variant="titleMedium">Display & Transpose</Text>
            <Chip compact>
              {baseKey ? (transpose !== 0 ? `Key: ${baseKey} → ${effectiveKey}` : `Key: ${baseKey}`) : 'Key: —'}
            </Chip>
            <View style={styles.headerSpacer} />
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close controls" />
          </View>

          <Divider />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mode</Text>
            <View style={styles.modeSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeScroll}>
                <SegmentedButtons
                  density="small"
                  value={mode}
                  onValueChange={(value) => {
                    if (value === 'inline' || value === 'over' || value === 'lyrics') {
                      Haptics.selectionAsync();
                      onModeChange(value);
                    }
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
              <IconButton
                icon="minus"
                mode="contained-tonal"
                size={20}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onTransposeDecrease();
                }}
                disabled={!canTransposeDown}
                accessibilityLabel="Transpose down"
              />
              <Chip compact elevated>{transpose >= 0 ? `+${transpose}` : `${transpose}`}</Chip>
              <IconButton
                icon="plus"
                mode="contained-tonal"
                size={20}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onTransposeIncrease();
                }}
                disabled={!canTransposeUp}
                accessibilityLabel="Transpose up"
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Font Size</Text>
            <View style={styles.group}>
              <IconButton
                icon="format-font-size-decrease"
                size={20}
                onPress={() => {
                  Haptics.selectionAsync();
                  onDecreaseFont();
                }}
                disabled={!canDecreaseFont}
                accessibilityLabel="Decrease text size"
              />
              <Chip compact>{fontSize}pt</Chip>
              <IconButton
                icon="format-font-size-increase"
                size={20}
                onPress={() => {
                  Haptics.selectionAsync();
                  onIncreaseFont();
                }}
                disabled={!canIncreaseFont}
                accessibilityLabel="Increase text size"
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Auto Scroll</Text>
            <View style={styles.autoScrollColumn}>
              <View style={styles.autoScrollControls}>
                <Switch
                  value={autoScrollEnabled}
                  onValueChange={(value) => {
                    Haptics.selectionAsync();
                    onToggleAutoScroll(value);
                  }}
                  accessibilityLabel="Toggle auto scroll"
                />
                <IconButton
                  icon="minus"
                  mode="contained-tonal"
                  size={20}
                  disabled={!canDecreaseAutoScrollSpeed}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDecreaseAutoScrollSpeed();
                  }}
                  accessibilityLabel="Decrease auto scroll speed"
                />
                <Chip compact elevated>{`${autoScrollSpeed}%`}</Chip>
                <IconButton
                  icon="plus"
                  mode="contained-tonal"
                  size={20}
                  disabled={!canIncreaseAutoScrollSpeed}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onIncreaseAutoScrollSpeed();
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
                <IconButton
                  icon="chevron-down"
                  size={20}
                  onPress={() => {
                    Haptics.selectionAsync();
                    modeConfig.onDecreaseLineGap();
                  }}
                  disabled={!modeConfig.canDecreaseLineGap}
                  accessibilityLabel="Reduce line spacing"
                />
                <Chip compact>{modeConfig.lineGap}px</Chip>
                <IconButton
                  icon="chevron-up"
                  size={20}
                  onPress={() => {
                    Haptics.selectionAsync();
                    modeConfig.onIncreaseLineGap();
                  }}
                  disabled={!modeConfig.canIncreaseLineGap}
                  accessibilityLabel="Increase line spacing"
                />
              </View>
            </View>
          ) : null}

          {mode === 'over' ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Chord/Lyric Gap</Text>
              <View style={styles.group}>
                <IconButton
                  icon="chevron-down"
                  size={20}
                  onPress={() => {
                    Haptics.selectionAsync();
                    modeConfig.onDecreaseOverGap();
                  }}
                  disabled={!modeConfig.canDecreaseOverGap}
                  accessibilityLabel="Reduce chord and lyric gap"
                />
                <Chip compact>{modeConfig.overGap}px</Chip>
                <IconButton
                  icon="chevron-up"
                  size={20}
                  onPress={() => {
                    Haptics.selectionAsync();
                    modeConfig.onIncreaseOverGap();
                  }}
                  disabled={!modeConfig.canIncreaseOverGap}
                  accessibilityLabel="Increase chord and lyric gap"
                />
              </View>
            </View>
          ) : null}
        </Surface>
      </RNAnimated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  surface: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    gap: 16,
  },
  grabberWrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: {
    width: 120,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoScrollColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  autoScrollControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSelector: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modeScroll: {
    alignSelf: 'flex-end',
  },
});
