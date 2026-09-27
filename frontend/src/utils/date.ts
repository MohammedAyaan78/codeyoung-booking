/**
 * Frontend timezone display utilities.
 *
 * These use the browser's Intl API — never manual offset arithmetic.
 * For UTC storage/conversion the backend uses Luxon; the frontend
 * only needs display helpers.
 */

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Uses Intl.DateTimeFormat with 'en-CA' locale which produces YYYY-MM-DD format.
 */
export function getLocalToday(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/**
 * Format a UTC ISO string for display in the given IANA timezone.
 * Returns e.g. "Monday, September 28, 2026"
 */
export function formatDisplayDate(utcIso: string, timezone: string): string {
  return new Date(utcIso).toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Normalise a potentially deprecated IANA timezone alias to its canonical name.
 * e.g. "Asia/Calcutta" → "Asia/Kolkata", "US/Eastern" → "America/New_York"
 * Uses the browser's Intl API — synchronous, no external dependency.
 */
export function normalizeTimezone(tz: string): string {
  try {
    return Intl.DateTimeFormat(undefined, { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return tz;
  }
}

/**
 * Add N days to a YYYY-MM-DD date string without timezone ambiguity.
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
