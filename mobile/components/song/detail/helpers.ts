export function normalizeKeyValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\[|\]/g, '').trim();
  if (!cleaned) return undefined;
  const token = cleaned.split(/\s+/)[0];
  return token || undefined;
}

export function extractKeyFromBody(body?: string | null): string | undefined {
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
