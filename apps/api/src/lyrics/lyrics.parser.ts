import type { NormalizedLyrics } from '@flowbyte/types';

export type LyricsFormat = 'lrc' | 'srt' | 'vtt' | 'json';

/**
 * LyricsProvider abstraction — additional providers (web APIs, other scrapers)
 * can implement this interface later without touching the rest of the app.
 */
export interface LyricsProvider {
  readonly name: string;
  /** Fetch lyrics for a song. Returns null when unavailable. */
  fetch(song: { title: string; artist?: string | null; sourceUrl?: string | null }): Promise<{
    content: string;
    format: LyricsFormat;
    language?: string;
  } | null>;
}

const TIME_RE = /(?:(\d+):)?(\d{1,2}):(\d{2}(?:[.,]\d{1,3})?)/;

function parseTimestamp(ms: string | undefined): number | null {
  if (!ms) return null;
  const match = ms.trim().match(TIME_RE);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2]!, 10);
  const seconds = parseFloat(match[3]!.replace(',', '.'));
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

/** Parse LRC (optionally with enhanced timing): [mm:ss.xx] text or [mm:ss.xx][mm:ss.yy] */
export function parseLrc(content: string, language = 'en'): NormalizedLyrics {
  const lines: NormalizedLyrics['lines'] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tagMatch = line.match(/^\[(\d+):(\d{2}(?:[.:]\d{1,3})?)\]/);
    const tags = line.match(/\[(\d+:)?(\d{1,2}):(\d{2}(?:[.:]\d{1,3})?)\]/g);
    if (!tags || !tagMatch) continue;
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    for (const tag of tags) {
      const start = parseTimestamp(tag.slice(1, -1));
      if (start === null) continue;
      lines.push({ start, end: null, text });
    }
  }
  lines.sort((a, b) => a.start - b.start);
  lines.forEach((l, i) => {
    if (l.end === null && lines[i + 1]) l.end = lines[i + 1]!.start;
  });
  return { version: 1, language, synced: lines.length > 0, lines };
}

/** Parse SRT: numbered blocks with start --> end timestamps. */
export function parseSrt(content: string, language = 'en'): NormalizedLyrics {
  const lines: NormalizedLyrics['lines'] = [];
  const blocks = content.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const m = block.match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/);
    if (!m) continue;
    const start = parseTimestamp(m[1]!);
    const end = parseTimestamp(m[2]!);
    const text = block
      .split(/\r?\n/)
      .filter((l) => !l.includes('-->') && !/^\d+$/.test(l.trim()))
      .join(' ')
      .trim();
    if (start !== null && text) lines.push({ start, end, text });
  }
  return { version: 1, language, synced: lines.length > 0, lines };
}

/** Parse WebVTT. */
export function parseVtt(content: string, language = 'en'): NormalizedLyrics {
  const cleaned = content.replace(/^\uFEFF?WEBVTT[^\n]*\n/, '');
  return parseSrt(cleaned, language);
}

export function parseLyrics(
  content: string,
  format: LyricsFormat,
  language = 'en',
): NormalizedLyrics {
  switch (format) {
    case 'lrc':
      return parseLrc(content, language);
    case 'srt':
      return parseSrt(content, language);
    case 'vtt':
      return parseVtt(content, language);
    case 'json': {
      const parsed = JSON.parse(content) as NormalizedLyrics;
      if (parsed.version !== 1) throw new Error(`Unsupported lyrics version: ${parsed.version}`);
      return parsed;
    }
  }
}

/** Extract language hint from a file name (e.g. "song.en.vtt" or "[en]"). */
export function languageFromName(name: string): string {
  const m = name.match(/[.-](\w{2,3})(?:\.|$)/);
  return m?.[1]?.toLowerCase() ?? 'en';
}