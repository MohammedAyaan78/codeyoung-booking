import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { BookingConfirmation, SlotDto } from '@codeyoung/shared';
import { prisma } from '../utils/prisma';
import { mentorAssignmentService } from './mentorAssignment.service';
import { availabilityService } from './availability.service';
import { AppError } from '../middleware/errorHandler';
import {
  SLOT_DURATION_MINUTES,
  formatLocalTime,
  formatLocalDate,
} from '../utils/timezone';
import { CreateBookingInput } from '../validators/booking.validator';
import { sendBookingEmails } from '../utils/email';

function createMeetingUrl(): string {
  return `https://demo.codeyoung.local/class/${uuidv4()}`;
}

/**
 * BookingService
 *
 * Orchestrates the full booking flow:
 *   1. Idempotency check
 *   2. Past-slot validation
 *   3. Atomic transaction:
 *      a. Upsert parent
 *      b. Lock mentors + assign eligible mentor
 *      c. Create booking
 *   4. Return confirmation DTO
 */
export class BookingService {
  async createBooking(
    input: CreateBookingInput,
    idempotencyKey: string
  ): Promise<BookingConfirmation> {
    // ── 1. Idempotency ────────────────────────────────────────────────────────
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: { mentor: true, parent: true },
    });

    if (existing) {
      return this.toConfirmation(existing, existing.mentor, existing.parent.name);
    }

    // ── 2. Parse and validate the requested UTC instant ───────────────────────
    const startsAtUtc = DateTime.fromISO(input.startUtc, { zone: 'utc' });
    if (!startsAtUtc.isValid) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid startUtc datetime.');
    }

    const endsAtUtc = startsAtUtc.plus({ minutes: SLOT_DURATION_MINUTES });
    const now = DateTime.now().setZone('utc');

    if (startsAtUtc <= now) {
      throw new AppError(400, 'PAST_SLOT', 'The requested slot is in the past.');
    }

    // ── 3. Atomic booking transaction ─────────────────────────────────────────
    const booking = await prisma.$transaction(
      async (tx) => {
        // Upsert parent (email is the natural key)
        const parent = await tx.parent.upsert({
          where: { email: input.parentEmail },
          update: {
            name: input.parentName,
            phone: input.parentPhone,
            timezone: input.parentTimezone,
          },
          create: {
            name: input.parentName,
            email: input.parentEmail,
            phone: input.parentPhone,
            timezone: input.parentTimezone,
          },
        });

        // Find and lock an eligible mentor
        const mentor = await mentorAssignmentService.findEligibleMentor(
          tx,
          startsAtUtc.toJSDate(),
          endsAtUtc.toJSDate()
        );

        if (!mentor) {
          // Gather alternative slots to surface to the user
          const alternatives = await this.findAlternatives(
            startsAtUtc.toISO()!,
            input.parentTimezone
          );
          throw new AppError(409, 'NO_AVAILABILITY', 'No mentor is available for this time.', {
            alternatives,
          });
        }

        const meetingUrl = createMeetingUrl();

        return tx.booking.create({
          data: {
            parentId: parent.id,
            mentorId: mentor.id,
            startsAtUtc: startsAtUtc.toJSDate(),
            endsAtUtc: endsAtUtc.toJSDate(),
            parentTimezone: input.parentTimezone,
            mentorTimezone: mentor.timezone,
            meetingUrl,
            idempotencyKey,
            status: 'CONFIRMED',
          },
          include: { mentor: true, parent: true },
        });
      },
      {
        isolationLevel: 'Serializable',
        timeout: 10_000,
      }
    );

    const confirmation = this.toConfirmation(booking, booking.mentor, booking.parent.name);
    // Send real emails to parent and mentor (Ethereal test SMTP — preview URL logged to console)
    sendBookingEmails({
      parentName:      booking.parent.name,
      parentEmail:     booking.parent.email,
      mentorName:      booking.mentor.name,
      mentorEmail:     booking.mentor.email,
      parentLocalStart: confirmation.parent.localStart,
      parentLocalEnd:   confirmation.parent.localEnd,
      parentTimezone:   confirmation.parent.timezone,
      parentLocalDate:  confirmation.parent.localDate,
      mentorLocalStart: confirmation.mentor.localStart,
      mentorLocalEnd:   confirmation.mentor.localEnd,
      mentorTimezone:   confirmation.mentor.timezone,
      mentorLocalDate:  confirmation.mentor.localDate,
      meetingUrl:       confirmation.meetingUrl,
      bookingId:        confirmation.bookingId,
    }).catch(() => {}); // fire-and-forget — email failure never breaks booking
    return confirmation;
  }

  async getBooking(id: string): Promise<BookingConfirmation> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { mentor: true, parent: true },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found.');
    }

    return this.toConfirmation(booking, booking.mentor, booking.parent.name);
  }

  private toConfirmation(
    booking: {
      id: string;
      startsAtUtc: Date;
      endsAtUtc: Date;
      parentTimezone: string;
      mentorTimezone: string;
      meetingUrl: string;
      status: string;
    },
    mentor: { name: string; timezone: string },
    parentName: string
  ): BookingConfirmation {
    const startIso = booking.startsAtUtc.toISOString();
    const endIso   = booking.endsAtUtc.toISOString();

    return {
      bookingId: booking.id,
      status: 'CONFIRMED',
      meetingUrl: booking.meetingUrl,
      startUtc: startIso,
      endUtc: endIso,
      parent: {
        name: parentName,
        timezone: booking.parentTimezone,
        localStart: formatLocalTime(startIso, booking.parentTimezone),
        localEnd:   formatLocalTime(endIso,   booking.parentTimezone),
        localDate:  formatLocalDate(startIso, booking.parentTimezone),
      },
      mentor: {
        name: mentor.name,
        timezone: booking.mentorTimezone,
        localStart: formatLocalTime(startIso, booking.mentorTimezone),
        localEnd:   formatLocalTime(endIso,   booking.mentorTimezone),
        localDate:  formatLocalDate(startIso, booking.mentorTimezone),
      },
    };
  }

  /**
   * Find up to 3 alternative available slots near the requested time.
   */
  private async findAlternatives(startUtcIso: string, timezone: string): Promise<SlotDto[]> {
    try {
      const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(timezone);
      const dateStr = dt.toISODate()!;
      const slots = await availabilityService.getAvailableSlots(dateStr, timezone);
      return slots.filter((s) => s.available && s.startUtc !== startUtcIso).slice(0, 3);
    } catch {
      return [];
    }
  }
}

export const bookingService = new BookingService();
