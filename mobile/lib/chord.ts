// ChordPro parsing and transposition utilities

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

type Scale = typeof SHARPS[number] | typeof FLATS[number];

function normalize(note: string): string {
  // Convert flats to equivalent sharps to simplify transposition
  const idx = FLATS.indexOf(note as any);
  if (idx !== -1) return SHARPS[idx];
  return note;
}

function transposeNote(note: string, steps: number): string {
  const n = normalize(note);
  const i = SHARPS.indexOf(n as any);
  if (i === -1) return note; // unknown note, return as-is
  const idx = (i + steps + SHARPS.length) % SHARPS.length;
  return SHARPS[idx];
}

export function transposeChordToken(token: string, steps: number): string {
  // Examples: C, F#m7, Bbmaj7, G/D, Dsus4, Cadd9, Em/G#
  const slashParts = token.split('/');
  const primary = slashParts[0];
  const bass = slashParts[1];

  const m = /^([A-G])([b#]?)(.*)$/.exec(primary);
  if (!m) return token;
  const root = m[1] + (m[2] || '');
  const rest = m[3] ?? '';
  const transposedRoot = transposeNote(root, steps);
  const transposedBass = bass ? transposeNote(bass, steps) : undefined;
  return transposedRoot + rest + (transposedBass ? `/${transposedBass}` : '');
}

export function transposeChordPro(text: string, steps: number): string {
  if (!steps) return text;
  // Replace [Chord] tokens while leaving lyrics intact
  return text.replace(/\[([^\]]+)\]/g, (_m, chord) => `[${transposeChordToken(chord, steps)}]`);
}

export function stripChordProDirectives(text: string): string {
  // Remove or keep metadata lines like {key:C}, {title:...}
  return text
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      if (!t) return true; // keep blank lines for stanza splitting
      if (t.startsWith('{')) return false; // directives
      if (t.startsWith('#')) return false; // comments / in-body title lines
      if (t.startsWith('%')) return false; // ChordPro comments
      return true;
    })
    .join('\n');
}

export function extractMeta(text: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /\{\s*([^:}]+)\s*:\s*([^}]+)\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    meta[m[1].toLowerCase()] = m[2];
  }
  return meta;
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function toDisplayLines(text: string): string[] {
  // Remove directives but keep chord inline style.
  return splitLines(stripChordProDirectives(text));
}
