import { DateTime } from 'luxon';

/**
 * Slot duration in minutes.
 * Assumption: all trial classes are 30 minutes.
 */
export const SLOT_DURATION_MINUTES = 30;

/**
 * Business hours in the MENTOR's local timezone.
 * Mentors are available 09:00–20:00 in their own timezone.
 * A slot starting at 19:30 is the last valid slot (ends at 20:00).
 */
export const BUSINESS_HOURS_START = 9;   // 09:00
export const BUSINESS_HOURS_END   = 20;  // 20:00 (last slot ends here)

/**
 * Maximum confirmed bookings a mentor may have on a single local calendar day.
 */
export const MAX_BOOKINGS_PER_MENTOR_PER_DAY = 2;

/**
 * Format a UTC DateTime into a human-readable local time string.
 * Example: "10:30 AM EDT"
 */
export function formatLocalTime(utcIso: string, timezone: string): string {
  const dt = DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(timezone);
  // 'h:mm a ZZZZ' → "10:30 AM EDT" (IANA abbreviation via ICU)
  return dt.toFormat('h:mm a ZZZZ');
}

/**
 * Format a UTC DateTime into a human-readable local date string.
 * Example: "Monday, September 28, 2026"
 */
export function formatLocalDate(utcIso: string, timezone: string): string {
  const dt = DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(timezone);
  return dt.toFormat('cccc, LLLL d, yyyy');
}

/**
 * Convert a UTC ISO string to a Luxon DateTime in the given IANA timezone.
 * Always use this — never manually compute offsets.
 */
export function toZonedDateTime(utcIso: string, timezone: string): DateTime {
  return DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(timezone);
}

/**
 * Get the local calendar date string (YYYY-MM-DD) for a UTC instant
 * in the given IANA timezone. Used for mentor daily-limit checks.
 */
export function getLocalDateString(utcIso: string, timezone: string): string {
  return DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(timezone).toISODate()!;
}

/**
 * Validate that a string is a recognised IANA timezone.
 * We require the zone to contain a '/' (e.g. America/New_York) to exclude
 * fixed-offset zones like 'UTC-5' and abbreviations like 'EST' which are
 * ambiguous and not proper IANA identifiers.
 */
export function isValidIanaTimezone(tz: string): boolean {
  // Must contain a slash — all proper IANA zones do (e.g. America/New_York)
  // This excludes 'UTC', 'EST', 'UTC-5', etc.
  if (!tz.includes('/')) return false;
  try {
    // Don't check zoneName === tz: legacy aliases like Asia/Calcutta are
    // normalised by the IANA DB (→ Asia/Kolkata) and are perfectly valid.
    const dt = DateTime.now().setZone(tz);
    return dt.isValid && dt.zoneName !== null;
  } catch {
    return false;
  }
}
