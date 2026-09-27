import { DateTime } from 'luxon';
import { SlotDto } from '@codeyoung/shared';
import {
  SLOT_DURATION_MINUTES,
  BUSINESS_HOURS_START,
  BUSINESS_HOURS_END,
} from '../utils/timezone';
import { prisma } from '../utils/prisma';
import { BookingStatus } from '@prisma/client';

/**
 * AvailabilityService
 *
 * Generates time slots for a given date in the parent's timezone,
 * then checks which slots still have at least one eligible mentor.
 *
 * Business hours are defined in UTC (09:00–20:00 UTC) as a simplification
 * for the demo environment. In production, business hours would be per-mentor.
 *
 * Assumption: slots are generated in the parent's requested timezone for the
 * requested date, then converted to UTC for availability checking.
 */
export class AvailabilityService {
  /**
   * Generate all slots for a date in the given timezone and mark availability.
   */
  async getAvailableSlots(dateStr: string, timezone: string): Promise<SlotDto[]> {
    // Parse the requested date in the parent's timezone
    const dayStart = DateTime.fromISO(dateStr, { zone: timezone }).startOf('day');

    if (!dayStart.isValid) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    // Generate all 30-min slots from 09:00 to 19:30 in the parent's timezone
    const slots: SlotDto[] = [];
    const now = DateTime.now().setZone('utc');

    let cursor = dayStart.set({ hour: BUSINESS_HOURS_START, minute: 0, second: 0, millisecond: 0 });
    const dayEnd = dayStart.set({ hour: BUSINESS_HOURS_END, minute: 0, second: 0, millisecond: 0 });

    while (cursor < dayEnd) {
      const slotEnd = cursor.plus({ minutes: SLOT_DURATION_MINUTES });

      const startUtc = cursor.toUTC();
      const endUtc = slotEnd.toUTC();

      // Skip slots in the past (with a 5-minute buffer)
      const isPast = startUtc < now.minus({ minutes: 5 });

      let available = false;
      if (!isPast) {
        available = await this.hasAvailableMentor(startUtc.toJSDate(), endUtc.toJSDate());
      }

      slots.push({
        startUtc: startUtc.toISO({ suppressMilliseconds: true })!,
        endUtc: endUtc.toISO({ suppressMilliseconds: true })!,
        localStart: cursor.toFormat('h:mm a ZZZZ'),
        localEnd: slotEnd.toFormat('h:mm a ZZZZ'),
        available,
      });

      cursor = slotEnd;
    }

    return slots;
  }

  /**
   * Check if at least one active mentor is available for the given UTC window.
   * A mentor is available if:
   *   1. They have no conflicting confirmed booking.
   *   2. They have fewer than MAX_BOOKINGS_PER_MENTOR_PER_DAY on their local calendar day.
   */
  private async hasAvailableMentor(startsAt: Date, endsAt: Date): Promise<boolean> {
    const mentors = await prisma.mentor.findMany({ where: { active: true } });

    for (const mentor of mentors) {
      const conflict = await this.mentorHasConflict(mentor.id, startsAt, endsAt);
      if (conflict) continue;

      const atLimit = await this.mentorAtDailyLimit(mentor.id, mentor.timezone, startsAt);
      if (atLimit) continue;

      return true;
    }

    return false;
  }

  async mentorHasConflict(mentorId: string, startsAt: Date, endsAt: Date): Promise<boolean> {
    const count = await prisma.booking.count({
      where: {
        mentorId,
        status: BookingStatus.CONFIRMED,
        AND: [{ startsAtUtc: { lt: endsAt } }, { endsAtUtc: { gt: startsAt } }],
      },
    });
    return count > 0;
  }

  /**
   * Evaluate the mentor's daily limit using the MENTOR's local calendar date.
   * This correctly handles midnight crossover and DST.
   */
  async mentorAtDailyLimit(
    mentorId: string,
    mentorTimezone: string,
    startsAtUtc: Date
  ): Promise<boolean> {
    // Convert the UTC instant to the mentor's local date
    const mentorLocalDate = DateTime.fromJSDate(startsAtUtc, { zone: 'utc' })
      .setZone(mentorTimezone);

    // Build the UTC window for the mentor's full local calendar day
    const mentorDayStartUtc = mentorLocalDate.startOf('day').toUTC().toJSDate();
    const mentorDayEndUtc   = mentorLocalDate.endOf('day').toUTC().toJSDate();

    const count = await prisma.booking.count({
      where: {
        mentorId,
        status: BookingStatus.CONFIRMED,
        startsAtUtc: { gte: mentorDayStartUtc, lte: mentorDayEndUtc },
      },
    });

    return count >= 2;
  }
}

export const availabilityService = new AvailabilityService();
