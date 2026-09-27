/**
 * Booking service integration tests.
 *
 * These tests use a real PostgreSQL database (test database).
 * They verify the full booking flow including:
 *   - Successful booking
 *   - Past slot rejection
 *   - Idempotency
 *   - Mentor daily limit (evaluated in mentor's local timezone)
 *   - Concurrent booking safety
 *   - No availability
 */

import { DateTime } from 'luxon';
import { PrismaClient, BookingStatus } from '@prisma/client';
import { bookingService } from '../../backend/src/services/booking.service';
import { CreateBookingInput } from '../../backend/src/validators/booking.validator';

const prisma = new PrismaClient();

// ── Test helpers ──────────────────────────────────────────────────────────────

async function createTestMentor(overrides: Partial<{
  name: string;
  email: string;
  timezone: string;
  active: boolean;
}> = {}) {
  return prisma.mentor.create({
    data: {
      name: overrides.name ?? 'Test Mentor',
      email: overrides.email ?? `mentor-${Date.now()}@test.local`,
      timezone: overrides.timezone ?? 'Asia/Kolkata',
      active: overrides.active ?? true,
    },
  });
}

async function cleanupMentor(id: string) {
  await prisma.booking.deleteMany({ where: { mentorId: id } });
  await prisma.mentor.delete({ where: { id } });
}

async function cleanupParent(email: string) {
  const parent = await prisma.parent.findFirst({ where: { email } });
  if (parent) {
    await prisma.booking.deleteMany({ where: { parentId: parent.id } });
    await prisma.parent.delete({ where: { id: parent.id } });
  }
}

function futureSlot(hoursFromNow = 2): string {
  return DateTime.now().setZone('utc').plus({ hours: hoursFromNow }).startOf('hour').toISO()!;
}

const BASE_INPUT: CreateBookingInput = {
  parentName: 'Test Parent',
  parentEmail: `parent-${Date.now()}@test.local`,
  parentPhone: '+1 555 000 0000',
  parentTimezone: 'America/New_York',
  startUtc: futureSlot(24),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookingService', () => {
  let mentorId: string;

  beforeAll(async () => {
    // Deactivate all existing mentors to isolate tests
    await prisma.mentor.updateMany({ data: { active: false } });
  });

  afterAll(async () => {
    // Reactivate all mentors
    await prisma.mentor.updateMany({ data: { active: true } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const mentor = await createTestMentor({ timezone: 'Asia/Kolkata' });
    mentorId = mentor.id;
  });

  afterEach(async () => {
    await cleanupMentor(mentorId);
    await cleanupParent(BASE_INPUT.parentEmail);
  });

  // ── Successful booking ──────────────────────────────────────────────────────

  it('creates a confirmed booking and returns correct timezone representations', async () => {
    const startUtc = futureSlot(24);
    const key = `test-${Date.now()}`;

    const result = await bookingService.createBooking(
      { ...BASE_INPUT, startUtc },
      key
    );

    expect(result.status).toBe('CONFIRMED');
    expect(result.bookingId).toBeTruthy();
    expect(result.meetingUrl).toMatch(/^https:\/\/demo\.codeyoung\.local\/class\//);
    expect(result.parent.timezone).toBe('America/New_York');
    expect(result.mentor.timezone).toBe('Asia/Kolkata');
    expect(result.parent.localStart).toBeTruthy();
    expect(result.mentor.localStart).toBeTruthy();
  });

  // ── Past slot ───────────────────────────────────────────────────────────────

  it('rejects a booking for a past slot', async () => {
    const pastSlot = DateTime.now().setZone('utc').minus({ hours: 1 }).toISO()!;

    await expect(
      bookingService.createBooking({ ...BASE_INPUT, startUtc: pastSlot }, `test-past-${Date.now()}`)
    ).rejects.toMatchObject({ code: 'PAST_SLOT' });
  });

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it('returns the same booking for duplicate idempotency key', async () => {
    const startUtc = futureSlot(25);
    const key = `idempotent-${Date.now()}`;

    const first = await bookingService.createBooking({ ...BASE_INPUT, startUtc }, key);
    const second = await bookingService.createBooking({ ...BASE_INPUT, startUtc }, key);

    expect(first.bookingId).toBe(second.bookingId);

    // Verify only one booking was created
    const count = await prisma.booking.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
  });

  // ── Mentor daily limit ──────────────────────────────────────────────────────

  it('enforces 2-booking daily limit using mentor local date', async () => {
    // Mentor is in Asia/Kolkata (UTC+5:30)
    // We'll book two slots on the same mentor local day, then a third should fail.

    // Pick a future date where mentor local day is clear
    const mentorLocalDay = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 3 })
      .startOf('day');

    const slot1Utc = mentorLocalDay.set({ hour: 9, minute: 0 }).toUTC().toISO()!;
    const slot2Utc = mentorLocalDay.set({ hour: 10, minute: 0 }).toUTC().toISO()!;
    const slot3Utc = mentorLocalDay.set({ hour: 11, minute: 0 }).toUTC().toISO()!;

    const email1 = `parent1-${Date.now()}@test.local`;
    const email2 = `parent2-${Date.now()}@test.local`;
    const email3 = `parent3-${Date.now()}@test.local`;

    await bookingService.createBooking(
      { ...BASE_INPUT, parentEmail: email1, startUtc: slot1Utc },
      `limit-1-${Date.now()}`
    );

    await bookingService.createBooking(
      { ...BASE_INPUT, parentEmail: email2, startUtc: slot2Utc },
      `limit-2-${Date.now()}`
    );

    // Third booking should fail — mentor is at daily limit
    await expect(
      bookingService.createBooking(
        { ...BASE_INPUT, parentEmail: email3, startUtc: slot3Utc },
        `limit-3-${Date.now()}`
      )
    ).rejects.toMatchObject({ code: 'NO_AVAILABILITY' });

    // Cleanup
    for (const email of [email1, email2, email3]) {
      await cleanupParent(email);
    }
  });

  // ── Midnight crossover: mentor daily limit ──────────────────────────────────

  it('counts mentor daily limit against mentor local date, not UTC date', async () => {
    // Mentor in Asia/Kolkata (UTC+5:30)
    // A booking at 23:30 New York time (EDT, UTC-4) on Sep 27 2026
    // = 03:30 UTC on Sep 28
    // = 09:00 India time on Sep 28
    // → counts against Sep 28 in India, not Sep 27

    // We simulate this by checking getLocalDateString
    const nyTime = DateTime.fromObject(
      { year: 2026, month: 9, day: 27, hour: 23, minute: 30 },
      { zone: 'America/New_York' }
    );
    const utcIso = nyTime.toUTC().toISO()!;

    const { getLocalDateString } = await import('../../backend/src/utils/timezone');

    const mentorDate = getLocalDateString(utcIso, 'Asia/Kolkata');
    const parentDate = getLocalDateString(utcIso, 'America/New_York');

    expect(mentorDate).toBe('2026-09-28');
    expect(parentDate).toBe('2026-09-27');
  });

  // ── No availability ─────────────────────────────────────────────────────────

  it('returns NO_AVAILABILITY when no active mentors exist', async () => {
    // Deactivate our test mentor
    await prisma.mentor.update({ where: { id: mentorId }, data: { active: false } });

    await expect(
      bookingService.createBooking(
        { ...BASE_INPUT, startUtc: futureSlot(26) },
        `no-avail-${Date.now()}`
      )
    ).rejects.toMatchObject({ code: 'NO_AVAILABILITY' });

    // Reactivate for cleanup
    await prisma.mentor.update({ where: { id: mentorId }, data: { active: true } });
  });

  // ── Concurrent bookings ─────────────────────────────────────────────────────

  it('prevents double-booking under concurrent requests', async () => {
    const startUtc = futureSlot(27);
    const email1 = `concurrent1-${Date.now()}@test.local`;
    const email2 = `concurrent2-${Date.now()}@test.local`;

    // Fire two booking requests simultaneously for the same slot
    const results = await Promise.allSettled([
      bookingService.createBooking(
        { ...BASE_INPUT, parentEmail: email1, startUtc },
        `concurrent-a-${Date.now()}`
      ),
      bookingService.createBooking(
        { ...BASE_INPUT, parentEmail: email2, startUtc },
        `concurrent-b-${Date.now()}`
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // With only one mentor, exactly one should succeed
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify only one confirmed booking exists for this slot
    const bookings = await prisma.booking.findMany({
      where: {
        mentorId,
        status: BookingStatus.CONFIRMED,
        startsAtUtc: new Date(startUtc),
      },
    });
    expect(bookings.length).toBe(1);

    // Cleanup
    for (const email of [email1, email2]) {
      await cleanupParent(email);
    }
  });
});
