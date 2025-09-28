import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { GuitarChordPosition } from '@/constants/chords';

const STRING_COUNT = 6;
const FRET_COUNT = 5;
const DIAGRAM_WIDTH = 200;
const DIAGRAM_HEIGHT = 220;
const H_PADDING = 20;
const TOP_MARGIN = 42;
const BOTTOM_MARGIN = 32;

const stringIndexToX = (stringIndex: number) => {
  const boardWidth = DIAGRAM_WIDTH - H_PADDING * 2;
  const spacing = boardWidth / (STRING_COUNT - 1);
  return H_PADDING + spacing * stringIndex;
};

const fretIndexToY = (fretIndex: number) => {
  const boardHeight = DIAGRAM_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
  const spacing = boardHeight / FRET_COUNT;
  return TOP_MARGIN + spacing * fretIndex;
};

type Props = {
  position: GuitarChordPosition;
  style?: StyleProp<ViewStyle>;
};

export const GuitarChordDiagram: React.FC<Props> = ({ position, style }) => {
  const theme = useTheme();
  const chordColor = theme.colors.primary;
  const fingers = position.fingers;

  const frettedDots = useMemo(() => {
    return position.frets
      .map((fret, idx) => ({ fret, idx }))
      .filter(({ fret }) => fret > 0);
  }, [position.frets]);

  const barreStringIndexes = useMemo(() => {
    if (!position.barres?.length) return new Set<number>();
    const indices = new Set<number>();
    position.barres.forEach((barre) => {
      const fromIdx = STRING_COUNT - barre.fromString;
      const toIdx = STRING_COUNT - barre.toString;
      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);
      for (let i = start; i <= end; i += 1) {
        if (position.frets[i] === barre.fret) {
          indices.add(i);
        }
      }
    });
    return indices;
  }, [position.barres, position.frets]);

  const openStrings = useMemo(() => {
    return position.frets
      .map((fret, idx) => ({ fret, idx }))
      .filter(({ fret }) => fret === 0);
  }, [position.frets]);

  const mutedStrings = useMemo(() => {
    return position.frets
      .map((fret, idx) => ({ fret, idx }))
      .filter(({ fret }) => fret < 0);
  }, [position.frets]);

  const baseFretLabel = position.baseFret > 1 ? `${position.baseFret}fr` : undefined;

  return (
    <View style={[styles.container, style]}>
      <Svg width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT}>
        {/* Strings */}
        {Array.from({ length: STRING_COUNT }).map((_, idx) => {
          const x = stringIndexToX(idx);
          return (
            <Line
              key={`string-${idx}`}
              x1={x}
              y1={TOP_MARGIN}
              x2={x}
              y2={DIAGRAM_HEIGHT - BOTTOM_MARGIN}
              stroke={theme.colors.onSurfaceDisabled}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Frets */}
        {Array.from({ length: FRET_COUNT + 1 }).map((_, idx) => {
          const y = fretIndexToY(idx);
          const isNut = position.baseFret === 1 && idx === 0;
          return (
            <Line
              key={`fret-${idx}`}
              x1={H_PADDING}
              y1={y}
              x2={DIAGRAM_WIDTH - H_PADDING}
              y2={y}
              stroke={theme.colors.onSurfaceDisabled}
              strokeWidth={isNut ? 6 : 2}
              strokeLinecap="round"
            />
          );
        })}

        {/* Barre(s) */}
        {position.barres?.map((barre) => {
          const fretCenter = barre.fret - position.baseFret + 0.5;
          if (fretCenter < 0 || fretCenter > FRET_COUNT + 0.5) return null;
          const y = fretIndexToY(fretCenter);
          const fromIdx = STRING_COUNT - barre.fromString;
          const toIdx = STRING_COUNT - barre.toString;
          const x1 = stringIndexToX(Math.min(fromIdx, toIdx));
          const x2 = stringIndexToX(Math.max(fromIdx, toIdx));
          const key = `barre-${barre.fret}-${barre.fromString}-${barre.toString}`;
          const lowIndex = Math.min(fromIdx, toIdx);
          const highIndex = Math.max(fromIdx, toIdx);
          const barreFinger = fingers ? fingers[lowIndex] || fingers[highIndex] || null : null;
          return (
            <G key={key}>
              <Rect
                x={x1 - 10}
                y={y - 12}
                width={x2 - x1 + 20}
                height={24}
                rx={12}
                fill={chordColor}
                opacity={0.35}
              />
              {barreFinger ? (
                <SvgText
                  x={(x1 + x2) / 2}
                  y={y + 5}
                  fontSize={14}
                  fill={theme.colors.onPrimary}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {barreFinger}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {/* Fretted notes */}
        {frettedDots.map(({ fret, idx }) => {
          const stringIdx = idx;
          if (barreStringIndexes.has(stringIdx)) {
            return null;
          }
          const relative = fret - position.baseFret + 0.5;
          if (relative < -0.1 || relative > FRET_COUNT + 0.5) return null;
          const cx = stringIndexToX(stringIdx);
          const cy = fretIndexToY(relative);
          const finger = fingers ? fingers[idx] || null : null;
          return (
            <React.Fragment key={`dot-${idx}-${fret}`}>
              <Circle cx={cx} cy={cy} r={12} fill={chordColor} />
              {finger ? (
                <SvgText
                  x={cx}
                  y={cy + 4}
                  fontSize={14}
                  fill={theme.colors.onPrimary}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {finger}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* Open strings */}
        {openStrings.map(({ idx }) => {
          const cx = stringIndexToX(idx);
          return (
            <Circle key={`open-${idx}`} cx={cx} cy={TOP_MARGIN - 18} r={8} stroke={chordColor} strokeWidth={2} fill="none" />
          );
        })}

        {/* Muted strings */}
        {mutedStrings.map(({ idx }) => {
          const cx = stringIndexToX(idx);
          const size = 8;
          const offset = size / Math.SQRT2;
          return (
            <React.Fragment key={`mute-${idx}`}>
              <Line
                x1={cx - offset}
                y1={TOP_MARGIN - 24}
                x2={cx + offset}
                y2={TOP_MARGIN - 8}
                stroke={theme.colors.onSurface}
                strokeWidth={2}
              />
              <Line
                x1={cx + offset}
                y1={TOP_MARGIN - 24}
                x2={cx - offset}
                y2={TOP_MARGIN - 8}
                stroke={theme.colors.onSurface}
                strokeWidth={2}
              />
            </React.Fragment>
          );
        })}

        {/* Base fret label */}
        {baseFretLabel ? (
          <SvgText
            x={H_PADDING - 12}
            y={fretIndexToY(0.5)}
            fontSize={12}
            fill={theme.colors.onSurfaceVariant}
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {baseFretLabel}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: DIAGRAM_WIDTH,
  },
});

export default GuitarChordDiagram;
