/**
 * Timezone utility unit tests.
 *
 * These tests verify correct IANA timezone handling, DST transitions,
 * midnight crossover, and mentor daily-limit date evaluation.
 *
 * All tests use real IANA zones — no manual offset arithmetic.
 */

import { DateTime } from 'luxon';
import {
  formatLocalTime,
  formatLocalDate,
  getLocalDateString,
  isValidIanaTimezone,
} from '../../backend/src/utils/timezone';

describe('isValidIanaTimezone', () => {
  it('accepts valid IANA zones', () => {
    expect(isValidIanaTimezone('America/New_York')).toBe(true);
    expect(isValidIanaTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidIanaTimezone('Europe/London')).toBe(true);
    expect(isValidIanaTimezone('Australia/Sydney')).toBe(true);
  });

  it('rejects invalid zones', () => {
    expect(isValidIanaTimezone('UTC-5')).toBe(false);
    expect(isValidIanaTimezone('EST')).toBe(false);
    expect(isValidIanaTimezone('not/a/zone')).toBe(false);
  });
});

describe('getLocalDateString — midnight crossover', () => {
  /**
   * Scenario: Parent in New York books 11:30 PM on Sep 27.
   * That is 2026-09-28T03:30:00Z in UTC.
   * In Asia/Kolkata (UTC+5:30) that is 2026-09-28T09:00:00+05:30 → Sep 28.
   * The mentor's daily limit must count against Sep 28, not Sep 27.
   */
  it('correctly maps UTC instant to mentor local date across midnight', () => {
    // 2026-09-27 23:30 America/New_York (EDT = UTC-4 in September)
    const nyTime = DateTime.fromObject(
      { year: 2026, month: 9, day: 27, hour: 23, minute: 30 },
      { zone: 'America/New_York' }
    );
    const utcIso = nyTime.toUTC().toISO()!;

    // Mentor is in Asia/Kolkata
    const mentorLocalDate = getLocalDateString(utcIso, 'Asia/Kolkata');
    expect(mentorLocalDate).toBe('2026-09-28');

    // Parent sees Sep 27
    const parentLocalDate = getLocalDateString(utcIso, 'America/New_York');
    expect(parentLocalDate).toBe('2026-09-27');
  });

  it('handles London DST — summer (BST = UTC+1)', () => {
    // July 15 2026 at 23:30 London time (BST = UTC+1) → 22:30 UTC
    const londonTime = DateTime.fromObject(
      { year: 2026, month: 7, day: 15, hour: 23, minute: 30 },
      { zone: 'Europe/London' }
    );
    const utcIso = londonTime.toUTC().toISO()!;

    // UTC is 22:30 on July 15 — still July 15 in UTC
    const utcDate = getLocalDateString(utcIso, 'UTC');
    expect(utcDate).toBe('2026-07-15');

    // London is still July 15 at 23:30
    const londonDate = getLocalDateString(utcIso, 'Europe/London');
    expect(londonDate).toBe('2026-07-15');
  });

  it('handles London DST — winter (GMT = UTC+0)', () => {
    // Jan 15 2026 at 23:30 London time (GMT = UTC+0) → 23:30 UTC
    const londonTime = DateTime.fromObject(
      { year: 2026, month: 1, day: 15, hour: 23, minute: 30 },
      { zone: 'Europe/London' }
    );
    const utcIso = londonTime.toUTC().toISO()!;
    const londonDate = getLocalDateString(utcIso, 'Europe/London');
    expect(londonDate).toBe('2026-01-15');
  });
});

describe('DST transitions — America/New_York', () => {
  /**
   * DST starts 2026-03-08 02:00 → clocks spring forward to 03:00.
   * DST ends  2026-11-01 02:00 → clocks fall back to 01:00.
   */

  it('correctly handles DST start — spring forward', () => {
    // 01:30 AM on March 8 2026 (still EST = UTC-5)
    const beforeDst = DateTime.fromObject(
      { year: 2026, month: 3, day: 8, hour: 1, minute: 30 },
      { zone: 'America/New_York' }
    );
    expect(beforeDst.offset).toBe(-300); // UTC-5

    // 03:30 AM on March 8 2026 (now EDT = UTC-4)
    const afterDst = DateTime.fromObject(
      { year: 2026, month: 3, day: 8, hour: 3, minute: 30 },
      { zone: 'America/New_York' }
    );
    expect(afterDst.offset).toBe(-240); // UTC-4
  });

  it('correctly handles DST end — fall back', () => {
    // 01:30 AM on Nov 1 2026 — this is ambiguous; Luxon resolves to first occurrence (EDT)
    const ambiguous = DateTime.fromObject(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      { zone: 'America/New_York' }
    );
    // After fall-back, 01:30 exists twice. Luxon defaults to the first (EDT = UTC-4).
    expect(ambiguous.isValid).toBe(true);

    // 02:30 AM is unambiguously EST (UTC-5)
    const afterFallback = DateTime.fromObject(
      { year: 2026, month: 11, day: 1, hour: 2, minute: 30 },
      { zone: 'America/New_York' }
    );
    expect(afterFallback.offset).toBe(-300); // UTC-5
  });

  it('formats time with correct abbreviation during EDT', () => {
    // June 15 2026 10:30 AM New York (EDT)
    const dt = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 10, minute: 30 },
      { zone: 'America/New_York' }
    );
    const utcIso = dt.toUTC().toISO()!;
    const formatted = formatLocalTime(utcIso, 'America/New_York');
    expect(formatted).toContain('10:30 AM');
    expect(formatted).toContain('EDT');
  });

  it('formats time with correct abbreviation during EST', () => {
    // Jan 15 2026 10:30 AM New York (EST)
    const dt = DateTime.fromObject(
      { year: 2026, month: 1, day: 15, hour: 10, minute: 30 },
      { zone: 'America/New_York' }
    );
    const utcIso = dt.toUTC().toISO()!;
    const formatted = formatLocalTime(utcIso, 'America/New_York');
    expect(formatted).toContain('10:30 AM');
    expect(formatted).toContain('EST');
  });
});

describe('Cross-timezone scenarios', () => {
  it('New York parent → India mentor: correct local times', () => {
    // Parent books 10:30 AM New York (EDT, UTC-4) on Sep 28 2026
    const nyTime = DateTime.fromObject(
      { year: 2026, month: 9, day: 28, hour: 10, minute: 30 },
      { zone: 'America/New_York' }
    );
    const utcIso = nyTime.toUTC().toISO()!;

    // UTC should be 14:30
    expect(utcIso).toContain('14:30');

    // India (UTC+5:30) should be 20:00
    const indiaFormatted = formatLocalTime(utcIso, 'Asia/Kolkata');
    expect(indiaFormatted).toContain('8:00 PM');

    // New York should be 10:30 AM EDT
    const nyFormatted = formatLocalTime(utcIso, 'America/New_York');
    expect(nyFormatted).toContain('10:30 AM');
  });

  it('London parent → India mentor: correct local times', () => {
    // Parent books 9:00 AM London (BST, UTC+1) on July 15 2026
    const londonTime = DateTime.fromObject(
      { year: 2026, month: 7, day: 15, hour: 9, minute: 0 },
      { zone: 'Europe/London' }
    );
    const utcIso = londonTime.toUTC().toISO()!;

    // UTC should be 08:00
    expect(utcIso).toContain('08:00');

    // India (UTC+5:30) should be 13:30
    const indiaFormatted = formatLocalTime(utcIso, 'Asia/Kolkata');
    expect(indiaFormatted).toContain('1:30 PM');
  });

  it('India parent → US mentor: correct local times', () => {
    // Parent books 9:00 AM India (UTC+5:30) on Sep 28 2026
    const indiaTime = DateTime.fromObject(
      { year: 2026, month: 9, day: 28, hour: 9, minute: 0 },
      { zone: 'Asia/Kolkata' }
    );
    const utcIso = indiaTime.toUTC().toISO()!;

    // UTC should be 03:30
    expect(utcIso).toContain('03:30');

    // New York (EDT, UTC-4) should be 11:30 PM on Sep 27
    const nyFormatted = formatLocalTime(utcIso, 'America/New_York');
    expect(nyFormatted).toContain('11:30 PM');

    // Mentor's local date is Sep 27, not Sep 28
    const mentorDate = getLocalDateString(utcIso, 'America/New_York');
    expect(mentorDate).toBe('2026-09-27');
  });
});

describe('formatLocalDate', () => {
  it('formats date correctly', () => {
    const dt = DateTime.fromObject(
      { year: 2026, month: 9, day: 28, hour: 14, minute: 30 },
      { zone: 'utc' }
    );
    const formatted = formatLocalDate(dt.toISO()!, 'America/New_York');
    expect(formatted).toContain('September');
    expect(formatted).toContain('28');
    expect(formatted).toContain('2026');
  });
});
