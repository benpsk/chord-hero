export type GuitarChordBarre = {
  fret: number;
  fromString: number;
  toString: number;
};

export type GuitarChordPosition = {
  id: string;
  label?: string;
  baseFret: number;
  frets: number[]; // indexed from low E (6th string) to high E (1st string)
  fingers?: (number | null)[];
  barres?: GuitarChordBarre[];
  description?: string;
};

export type GuitarChord = {
  name: string;
  variant?: string;
  positions: GuitarChordPosition[];
};

export const CHORD_LIBRARY: Record<string, GuitarChord> = {
  C: {
    name: 'C Major',
    positions: [
      {
        id: 'c-open',
        label: 'Open',
        baseFret: 1,
        frets: [-1, 3, 2, 0, 1, 0],
        fingers: [null, 3, 2, null, 1, null],
        description: 'Standard open C shape. Avoid strumming the 6th string.',
      },
      {
        id: 'c-barre-3',
        label: 'Barre (3rd fret)',
        baseFret: 3,
        frets: [3, 3, 5, 5, 5, 3],
        fingers: [1, 1, 3, 4, 4, 1],
        barres: [{ fret: 3, fromString: 6, toString: 1 }],
        description: 'E-shape barre chord rooted on the 5th string.',
      },
      {
        id: 'c-barre-8',
        label: 'Barre (8th fret)',
        baseFret: 8,
        frets: [8, 10, 10, 9, 8, 8],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 8, fromString: 6, toString: 1 }],
        description: 'Root-6 barre shape at the 8th fret.',
      },
      {
        id: 'c-voicing-5',
        label: 'Triad (5th fret)',
        baseFret: 5,
        frets: [-1, -1, 10, 9, 8, 8],
        fingers: [null, null, 4, 3, 2, 1],
        description: 'Compact triad voicing for higher-register comping.',
      },
    ],
  },
  Cm: {
    name: 'C Minor',
    positions: [
      {
        id: 'cm-barre-3',
        label: 'Barre (3rd fret)',
        baseFret: 3,
        frets: [3, 5, 5, 4, 3, 3],
        fingers: [1, 3, 4, 2, 1, 1],
        barres: [{ fret: 3, fromString: 6, toString: 1 }],
        description: 'E-shape barre chord with minor third.',
      },
      {
        id: 'cm-barre-8',
        label: 'Barre (8th fret)',
        baseFret: 8,
        frets: [8, 10, 10, 8, 8, 8],
        fingers: [1, 3, 4, 1, 1, 1],
        barres: [{ fret: 8, fromString: 6, toString: 1 }],
        description: 'A-shape barre voicing rooted on the 6th string.',
      },
      {
        id: 'cm-triad-10',
        label: 'Triad (10th fret)',
        baseFret: 10,
        frets: [-1, -1, 10, 8, 8, 8],
        fingers: [null, null, 4, 2, 1, 1],
        description: 'Compact triad for higher-register comping.',
      },
    ],
  },
};

export function getChordByName(chordName: string): GuitarChord | undefined {
  const normalized = chordName.trim();
  return CHORD_LIBRARY[normalized] ?? CHORD_LIBRARY[normalized.toUpperCase()];
}
