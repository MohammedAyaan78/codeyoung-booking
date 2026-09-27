import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface CreateBookingData {
  parentId: string;
  mentorId: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  parentTimezone: string;
  mentorTimezone: string;
  meetingUrl: string;
  idempotencyKey: string;
}

export const bookingRepository = {
  /**
   * Find a booking by its idempotency key.
   */
  findByIdempotencyKey(key: string): Promise<Booking | null> {
    return prisma.booking.findUnique({ where: { idempotencyKey: key } });
  },

  /**
   * Find a booking by its ID.
   */
  findById(id: string): Promise<(Booking & { mentor: { name: string; timezone: string } }) | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: { mentor: { select: { name: true, timezone: true } } },
    });
  },

  /**
   * Count confirmed bookings for a mentor within a UTC time window.
   * The window should represent the mentor's full local calendar day in UTC.
   */
  countMentorBookingsInWindow(
    mentorId: string,
    windowStartUtc: Date,
    windowEndUtc: Date
  ): Promise<number> {
    return prisma.booking.count({
      where: {
        mentorId,
        status: BookingStatus.CONFIRMED,
        startsAtUtc: { gte: windowStartUtc, lt: windowEndUtc },
      },
    });
  },

  /**
   * Check if a mentor has a confirmed booking that overlaps with the given window.
   */
  async hasMentorConflict(
    mentorId: string,
    startsAtUtc: Date,
    endsAtUtc: Date
  ): Promise<boolean> {
    const count = await prisma.booking.count({
      where: {
        mentorId,
        status: BookingStatus.CONFIRMED,
        AND: [
          { startsAtUtc: { lt: endsAtUtc } },
          { endsAtUtc: { gt: startsAtUtc } },
        ],
      },
    });
    return count > 0;
  },

  /**
   * Create a booking inside a provided transaction client.
   * Must be called within a Prisma transaction with row-level locking.
   */
  createWithinTransaction(
    tx: Prisma.TransactionClient,
    data: CreateBookingData
  ): Promise<Booking> {
    return tx.booking.create({
      data: {
        ...data,
        status: BookingStatus.CONFIRMED,
      },
    });
  },

  /**
   * Get all confirmed bookings for a mentor (for admin/debug use).
   */
  findMentorBookings(mentorId: string): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { mentorId, status: BookingStatus.CONFIRMED },
      orderBy: { startsAtUtc: 'asc' },
    });
  },
};
