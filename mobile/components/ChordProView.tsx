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
  lyricColor?: string;
  onChordPress?: (chordName: string) => void;
};

export const ChordProView: React.FC<Props> = ({
  lines,
  chordColor = '#0a7ea4',
  mode = 'over',
  fontSize = 16,
  overGap = 2,
  lineGap = 0,
  lyricColor = '#111111',
  onChordPress,
}) => {
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
  const hasModeMarker = useMemo(() => lines.some((line) => line.trim() === '||'), [lines]);
  const rendered: React.ReactNode[] = [];
  let modeActive = !hasModeMarker;

  lines.forEach((line, idx) => {
    if (line.trim() === '||') {
      modeActive = true;
      return;
    }
    if (!modeActive) {
      rendered.push(
        <Text key={`premode-${idx}`} style={[styles.line, dynamicLine, { color: lyricColor }]}>
          {renderInlineWithoutBrackets(line, chordColor, onChordPress)}
        </Text>
      );
      return;
    }
    const lineMode = mode;

    if (lineMode === 'lyrics') {
      const { lyric } = parseInline(line);
      rendered.push(
        <Text key={`lyrics-${idx}`} style={[styles.line, dynamicLine, { color: lyricColor }]}>
          {lyric || '\u200B'}
        </Text>
      );
      return;
    }
    if (lineMode === 'chords') {
      const { chordLine } = toOverLine(line);
      rendered.push(
        <Text key={`chords-${idx}`} style={[styles.line, styles.mono, dynamicLine, { color: chordColor }]}>
          {renderChordLine(chordLine, chordColor, onChordPress)}
        </Text>
      );
      return;
    }
    if (lineMode === 'over') {
      const { chordLine, lyric } = toOverLine(line);
      const trimmedChord = chordLine.trim();
      if (!trimmedChord) {
        rendered.push(
          <Text key={`over-plain-${idx}`} style={[styles.line, dynamicLine, { color: lyricColor }]}>
            {lyric || '\u200B'}
          </Text>
        );
        return;
      }
      if (!cols || !isFinite(cols)) {
        rendered.push(
          <View key={`over-fallback-${idx}`} style={{ marginBottom: overGap }}>
            <Text style={[styles.line, styles.mono, dynamicLine, { color: chordColor, marginBottom: overGap }]}>
              {renderChordLine(chordLine, chordColor, onChordPress)}
            </Text>
            <Text style={[styles.line, styles.mono, dynamicLine, { color: lyricColor }]}>{lyric || '\u200B'}</Text>
          </View>
        );
        return;
      }
      const segs = sliceByColumns(chordLine, lyric, cols);
      rendered.push(
        <View key={`over-${idx}`}>
          {segs.map((seg, i) => (
            <View key={`over-${idx}-${i}`} style={{ marginBottom: overGap }}>
              <Text style={[styles.line, styles.mono, dynamicLine, { color: chordColor, marginBottom: overGap }]}>
                {renderChordLine(seg.chords, chordColor, onChordPress)}
              </Text>
              <Text style={[styles.line, styles.mono, dynamicLine, { color: lyricColor }]}>{seg.lyric || '\u200B'}</Text>
            </View>
          ))}
        </View>
      );
      return;
    }

    rendered.push(
      <Text key={`inline-${idx}`} style={[styles.line, dynamicLine, { color: lyricColor }]}>
        {renderInline(line, chordColor, onChordPress)}
      </Text>
    );
  });

  return (
    <View style={[styles.container, mode === 'over' && { gap: 0 }]} onLayout={onLayout}>
      {rendered}
    </View>
  );
};

function renderInline(line: string, chordColor: string, onChordPress?: (chord: string) => void) {
  if (line.trim().length === 0) return '\u200B';
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const textPart = line.slice(lastIndex, m.index);
    if (textPart) parts.push(textPart);
    parts.push(createInlineChordNode(m[1], m.index, chordColor, onChordPress, true));
    lastIndex = re.lastIndex;
  }
  const tail = line.slice(lastIndex);
  if (tail) parts.push(tail);
  return parts;
}

function parseInline(line: string): { lyric: string; chords: { name: string; pos: number }[] } {
  const chords: { name: string; pos: number }[] = [];
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

function renderInlineWithoutBrackets(line: string, chordColor: string, onChordPress?: (chord: string) => void) {
  if (line.trim().length === 0) return '\u200B';
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const textPart = line.slice(lastIndex, m.index);
    if (textPart) parts.push(textPart);
    const chordText = m[1];
    if (chordText) {
      parts.push(createInlineChordNode(chordText, `inline-${m.index}`, chordColor, onChordPress, false));
    }
    lastIndex = re.lastIndex;
  }
  const tail = line.slice(lastIndex);
  if (tail) parts.push(tail);
  return parts.length ? parts : '\u200B';
}

function createInlineChordNode(
  chordName: string,
  key: string | number,
  chordColor: string,
  onChordPress?: (chord: string) => void,
  showBrackets = true
) {
  const content = showBrackets ? `[${chordName}]` : chordName;
  const handlePress = onChordPress ? () => onChordPress(chordName) : undefined;
  return (
    <Text
      key={key}
      style={[styles.chord, { color: chordColor }]}
      onPress={handlePress}
      suppressHighlighting
    >
      {content}
    </Text>
  );
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

function sliceByColumns(chords: string, lyric: string, cols: number): { chords: string; lyric: string }[] {
  const out: { chords: string; lyric: string }[] = [];
  const maxLen = Math.max(chords.length, lyric.length);
  for (let i = 0; i < maxLen; i += cols) {
    const c = chords.slice(i, i + cols);
    const l = lyric.slice(i, i + cols);
    out.push({ chords: c, lyric: l });
  }
  return out.length ? out : [{ chords, lyric }];
}

function renderChordLine(chordLine: string, chordColor: string, onChordPress?: (chord: string) => void) {
  if (!chordLine.trim()) return chordLine || '\u200B';
  const nodes: React.ReactNode[] = [];
  let buffer = '';
  for (let i = 0; i < chordLine.length; i += 1) {
    const char = chordLine[i];
    if (char === ' ') {
      buffer += ' ';
      continue;
    }
    if (buffer) {
      nodes.push(buffer);
      buffer = '';
    }
    let j = i;
    let chord = '';
    while (j < chordLine.length && chordLine[j] !== ' ') {
      chord += chordLine[j];
      j += 1;
    }
    const key = `over-chord-${i}-${chord}`;
    nodes.push(
      <Text
        key={key}
        style={[styles.chord, { color: chordColor }]}
        onPress={onChordPress ? () => onChordPress(chord) : undefined}
        suppressHighlighting
      >
        {chord}
      </Text>
    );
    i = j - 1;
  }
  if (buffer) nodes.push(buffer);
  return nodes.length ? nodes : chordLine || '\u200B';
}

const styles = StyleSheet.create({
  container: {},
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
