import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

// Simple inline ChordPro renderer: renders [C] chords with accent color
// and monospaced font, leaves lyrics as normal text.

type Props = {
  lines: string[];
  chordColor?: string;
  mode?: 'inline' | 'over' | 'lyrics' | 'chords';
  fontSize?: number;
  overGap?: number; // vertical spacing between chord and lyric in 'over' mode (px)
  lineGap?: number; // extra px added to line height in all modes
};

export const ChordProView: React.FC<Props> = ({ lines, chordColor = '#0a7ea4', mode = 'inline', fontSize = 16, overGap = 2, lineGap = 0 }) => {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const charWidth = useMemo(() => fontSize * 0.62, [fontSize]);
  const cols = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.max(8, Math.floor(containerWidth / charWidth));
  }, [containerWidth, charWidth]);

  const dynamicLine = { fontSize, lineHeight: Math.round(fontSize * 1.3) + lineGap } as const;
  return (
    <View style={styles.container} onLayout={onLayout}>
      {lines.map((line, idx) => {
        if (mode === 'lyrics') {
          const { lyric } = parseInline(line);
          return (
            <Text key={idx} style={[styles.line, dynamicLine]}>
              {lyric || '\u200B'}
            </Text>
          );
        }
        if (mode === 'chords') {
          const { chordLine } = toOverLine(line);
          return (
            <Text key={idx} style={[styles.line, styles.mono, dynamicLine, { color: chordColor }]}>
              {chordLine || '\u200B'}
            </Text>
          );
        }
        if (mode === 'over') {
          const { chordLine, lyric } = toOverLine(line);
          if (!cols || !isFinite(cols)) {
            // Fallback: no measured width yet
            return (
              <View key={idx} style={{ marginBottom: 2 }}>
                <Text style={[styles.line, styles.mono, dynamicLine, { color: chordColor, marginBottom: overGap }]}>{chordLine || '\u200B'}</Text>
                <Text style={[styles.line, styles.mono, dynamicLine]}>{lyric || '\u200B'}</Text>
              </View>
            );
          }
          // Soft-wrap by columns so chord/lyric segments align when wrapped
          const segs = sliceByColumns(chordLine, lyric, cols);
          return (
            <View key={idx}>
              {segs.map((seg, i) => (
                <View key={i} style={{ marginBottom: 2 }}>
                  <Text style={[styles.line, styles.mono, dynamicLine, { color: chordColor, marginBottom: overGap }]}>
                    {seg.chords || '\u200B'}
                  </Text>
                  <Text style={[styles.line, styles.mono, dynamicLine]}>{seg.lyric || '\u200B'}</Text>
                </View>
              ))}
            </View>
          );
        }
        // inline
        return (
          <Text key={idx} style={[styles.line, dynamicLine]}>
            {renderInline(line, chordColor)}
          </Text>
        );
      })}
    </View>
  );
};

function renderInline(line: string, chordColor: string) {
  if (line.trim().length === 0) return '\u200B';
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const textPart = line.slice(lastIndex, m.index);
    if (textPart) parts.push(textPart);
    parts.push(
      <Text key={m.index} style={[styles.chord, { color: chordColor }]}>[{m[1]}]</Text>
    );
    lastIndex = re.lastIndex;
  }
  const tail = line.slice(lastIndex);
  if (tail) parts.push(tail);
  return parts;
}

function parseInline(line: string): { lyric: string; chords: Array<{ name: string; pos: number }> } {
  const chords: Array<{ name: string; pos: number }> = [];
  let lyric = '';
  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const textPart = line.slice(lastIndex, m.index);
    lyric += textPart;
    chords.push({ name: m[1], pos: lyric.length });
    lastIndex = re.lastIndex;
  }
  lyric += line.slice(lastIndex);
  return { lyric, chords };
}

function toOverLine(line: string): { chordLine: string; lyric: string } {
  if (!line.trim()) return { chordLine: '', lyric: '' };
  const { lyric, chords } = parseInline(line);
  if (chords.length === 0) return { chordLine: '', lyric };
  let chordLine = '';
  for (const { name, pos } of chords) {
    if (pos < 0) continue;
    if (chordLine.length < pos) {
      chordLine += ' '.repeat(pos - chordLine.length);
    }
    // place chord name starting at pos
    chordLine += name;
  }
  return { chordLine, lyric };
}

function sliceByColumns(chords: string, lyric: string, cols: number): Array<{ chords: string; lyric: string }> {
  const out: Array<{ chords: string; lyric: string }> = [];
  const maxLen = Math.max(chords.length, lyric.length);
  for (let i = 0; i < maxLen; i += cols) {
    const c = chords.slice(i, i + cols);
    const l = lyric.slice(i, i + cols);
    out.push({ chords: c, lyric: l });
  }
  return out.length ? out : [{ chords, lyric }];
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  line: {
    fontSize: 16,
    lineHeight: 24,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  chord: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '600',
  },
});

export default ChordProView;
