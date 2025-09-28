import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chip,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ChordDiagramCarousel } from '@/components/ChordDiagramCarousel';
import { getChordByName } from '@/constants/chords';

type ChordQualityKey = 'major' | 'minor' | '7' | '9';
type AccidentalMode = 'sharp' | 'flat';

const SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G'];
const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G'];

const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  'C#': 'Db',
  'Db': 'C#',
  'D#': 'Eb',
  'Eb': 'D#',
  'F#': 'Gb',
  'Gb': 'F#',
};

const CHORD_QUALITIES: { key: ChordQualityKey; label: string; display: string; suffix: string }[] = [
  { key: 'major', label: 'Major', display: 'major', suffix: '' },
  { key: 'minor', label: 'Minor', display: 'minor', suffix: 'm' },
  { key: '7', label: '7', display: '7', suffix: '7' },
  { key: '9', label: '9', display: '9', suffix: '9' },
];

export default function ChordLibraryScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme];

  const [accidentalMode, setAccidentalMode] = useState<AccidentalMode>('sharp');
  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedQuality, setSelectedQuality] = useState<ChordQualityKey>('major');

  const availableRoots = useMemo(() => (accidentalMode === 'sharp' ? SHARP_ROOTS : FLAT_ROOTS), [accidentalMode]);

  useEffect(() => {
    if (!availableRoots.includes(selectedRoot)) {
      const enharmonic = ENHARMONIC_EQUIVALENTS[selectedRoot];
      if (enharmonic && availableRoots.includes(enharmonic)) {
        setSelectedRoot(enharmonic);
      } else {
        setSelectedRoot(availableRoots[0]);
      }
    }
  }, [accidentalMode, availableRoots, selectedRoot]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: palette.background,
        },
        content: {
          paddingHorizontal: 24,
          paddingVertical: 24,
          gap: 24,
        },
        card: {
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 20,
          paddingVertical: 20,
          gap: 20,
          elevation: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        toggleGroup: {
          alignSelf: 'flex-end',
        },
        title: {
          color: palette.text,
          fontSize: 22,
          fontWeight: '700',
        },
        subtitle: {
          color: palette.icon,
          fontSize: 14,
          fontWeight: '600',
          marginBottom: 8,
        },
        chipScrollContent: {
          paddingRight: 12,
          paddingBottom: 4,
        },
        chip: {
          marginRight: 8,
        },
        summaryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        summaryLabel: {
          color: palette.icon,
          fontSize: 14,
        },
        summaryValue: {
          color: palette.text,
          fontSize: 20,
          fontWeight: '700',
        },
        placeholder: {
          borderRadius: 16,
          paddingVertical: 20,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [palette.background, palette.icon, palette.text, theme.colors.surface]
  );

  const selectedQualityMeta =
    CHORD_QUALITIES.find((quality) => quality.key === selectedQuality) ?? CHORD_QUALITIES[0];

  const canonicalRoot = selectedRoot.charAt(0).toUpperCase();
  const chordLookupKey = `${canonicalRoot}${selectedQualityMeta.suffix}`;
  const chordData = getChordByName(chordLookupKey);
  const chordDisplayName = `${selectedRoot}${selectedQualityMeta.display}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.header}>
            <Text style={styles.title}>Chord Library</Text>
            <SegmentedButtons
              value={accidentalMode}
              onValueChange={(value) => setAccidentalMode(value as AccidentalMode)}
              style={styles.toggleGroup}
              buttons={[
                { value: 'sharp', label: '#' },
                { value: 'flat', label: 'b' },
              ]}
            />
          </View>

          <View>
            <Text style={styles.subtitle}>Chord Root</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScrollContent}>
              {availableRoots.map((root) => {
                const selected = root === selectedRoot;
                return (
                  <Chip
                    key={`root-${root}`}
                    onPress={() => setSelectedRoot(root)}
                    selected={selected}
                    compact
                    style={styles.chip}
                    mode={selected ? 'flat' : 'outlined'}
                  >
                    {root}
                  </Chip>
                );
              })}
            </ScrollView>
          </View>

          <View>
            <Text style={styles.subtitle}>Chord Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScrollContent}>
              {CHORD_QUALITIES.map((quality) => {
                const selected = quality.key === selectedQuality;
                return (
                  <Chip
                    key={`quality-${quality.key}`}
                    onPress={() => setSelectedQuality(quality.key)}
                    selected={selected}
                    compact
                    style={styles.chip}
                    mode={selected ? 'flat' : 'outlined'}
                  >
                    {quality.label}
                  </Chip>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected</Text>
            <Text style={styles.summaryValue}>{chordDisplayName}</Text>
          </View>

          {chordData ? (
            <ChordDiagramCarousel positions={chordData.positions} />
          ) : (
            <Surface style={[styles.placeholder, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Chord diagrams for {chordDisplayName} coming soon.
              </Text>
            </Surface>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
