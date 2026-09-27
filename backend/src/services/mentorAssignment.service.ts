import { Mentor, Prisma, BookingStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { MAX_BOOKINGS_PER_MENTOR_PER_DAY } from '../utils/timezone';

/**
 * MentorAssignmentService
 *
 * Assignment strategy (deterministic, documented):
 *   1. Filter to active mentors only.
 *   2. Exclude mentors with a conflicting confirmed booking (overlap check).
 *   3. Exclude mentors at their daily limit (evaluated in MENTOR's local timezone).
 *   4. Among eligible mentors, prefer the one with the fewest bookings today
 *      (load balancing). Ties broken by mentor ID (stable, deterministic).
 *
 * This is intentionally NOT random — deterministic assignment makes the system
 * testable and auditable.
 */
export class MentorAssignmentService {
  /**
   * Find the best eligible mentor for a given UTC slot.
   * Must be called inside a database transaction with appropriate locking.
   */
  async findEligibleMentor(
    tx: Prisma.TransactionClient,
    startsAtUtc: Date,
    endsAtUtc: Date
  ): Promise<Mentor | null> {
    // Lock all active mentors for this transaction to prevent race conditions
    const mentors = await tx.$queryRaw<Mentor[]>`
      SELECT * FROM "Mentor"
      WHERE active = true
      ORDER BY id ASC
      FOR UPDATE
    `;

    const candidates: Array<{ mentor: Mentor; bookingCount: number }> = [];

    for (const mentor of mentors) {
      // Check for time conflict
      const conflictCount = await tx.booking.count({
        where: {
          mentorId: mentor.id,
          status: BookingStatus.CONFIRMED,
          AND: [
            { startsAtUtc: { lt: endsAtUtc } },
            { endsAtUtc: { gt: startsAtUtc } },
          ],
        },
      });

      if (conflictCount > 0) continue;

      // Check daily limit using MENTOR's local calendar date
      const mentorLocalDate = DateTime.fromJSDate(startsAtUtc, { zone: 'utc' })
        .setZone(mentor.timezone);

      const mentorDayStartUtc = mentorLocalDate.startOf('day').toUTC().toJSDate();
      const mentorDayEndUtc   = mentorLocalDate.endOf('day').toUTC().toJSDate();

      const dailyCount = await tx.booking.count({
        where: {
          mentorId: mentor.id,
          status: BookingStatus.CONFIRMED,
          startsAtUtc: { gte: mentorDayStartUtc, lte: mentorDayEndUtc },
        },
      });

      if (dailyCount >= MAX_BOOKINGS_PER_MENTOR_PER_DAY) continue;

      candidates.push({ mentor, bookingCount: dailyCount });
    }

    if (candidates.length === 0) return null;

    // Sort: fewest bookings today first, then by ID for stability
    candidates.sort((a, b) => {
      if (a.bookingCount !== b.bookingCount) return a.bookingCount - b.bookingCount;
      return a.mentor.id.localeCompare(b.mentor.id);
    });

    return candidates[0].mentor;
  }
}

export const mentorAssignmentService = new MentorAssignmentService();
