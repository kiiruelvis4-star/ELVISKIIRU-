import { TermsConfig } from './types';

export const TZ = 'Africa/Nairobi';

export function nairobiStamp(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function nairobiClock(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

export function nairobiDateLabel(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export function nairobiParts(d: Date) {
  try {
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(d)
      .forEach((x) => (parts[x.type] = x.value));
    return {
      y: parseInt(parts.year, 10),
      m: parseInt(parts.month, 10) - 1,
      d: parseInt(parts.day, 10),
      key: `${parts.year}-${parts.month}-${parts.day}`,
    };
  } catch {
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    return {
      y,
      m,
      d: day,
      key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  }
}

export function currentTerm(terms: TermsConfig): 'Term 1' | 'Term 2' | 'Term 3' | null {
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const termKeys: ('Term 1' | 'Term 2' | 'Term 3')[] = ['Term 1', 'Term 2', 'Term 3'];
  for (const t of termKeys) {
    const d = terms[t];
    if (d.open && d.close) {
      const openDate = new Date(d.open);
      const closeDate = new Date(d.close);
      if (t0 >= openDate && t0 <= closeDate) {
        return t;
      }
    }
  }
  return null;
}

export function admFormat(n: number): string {
  return 'LRA/' + String(n).padStart(4, '0');
}

export function initials(n: string): string {
  return String(n)
    .replace(/^(Mr|Mrs|Ms|Madam|Dr)\s+/i, '')
    .split(/\s+/)
    .map((x) => x[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export async function hashText(text: string, salt: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(salt + '|' + text)
    );
    return Array.from(new Uint8Array(buffer))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  }
  // Simple fallback
  return btoa(salt + text);
}
