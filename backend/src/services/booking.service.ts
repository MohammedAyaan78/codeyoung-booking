import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { BookingConfirmation, SlotDto, EmailNotificationStatus } from '@codeyoung/shared';
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
import { sendBookingConfirmationEmails, buildClassroomUrl } from '../utils/email';

// Augmented booking type that includes relations and email status fields
// (email status fields are added by migration; Prisma client types update after `prisma generate`)
type BookingWithRelations = {
  id: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  parentTimezone: string;
  mentorTimezone: string;
  meetingUrl: string;
  status: string;
  parentEmailStatus?: string;
  mentorEmailStatus?: string;
  mentor: { name: string; email: string; timezone: string };
  parent: { name: string; email: string };
};

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
 *   4. Send confirmation emails (outside transaction — never fails the booking)
 *   5. Persist email delivery status
 *   6. Return confirmation DTO
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
      // Return the original confirmation — do NOT resend emails
      const b = existing as unknown as BookingWithRelations;
      return this.toConfirmation(b, b.mentor, b.parent.name, {
        parent: (b.parentEmailStatus ?? 'PENDING') as EmailNotificationStatus,
        mentor: (b.mentorEmailStatus ?? 'PENDING') as EmailNotificationStatus,
      });
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
    const rawBooking = await prisma.$transaction(
      async (tx) => {
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

        const mentor = await mentorAssignmentService.findEligibleMentor(
          tx,
          startsAtUtc.toJSDate(),
          endsAtUtc.toJSDate()
        );

        if (!mentor) {
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

    const booking = rawBooking as unknown as BookingWithRelations;
    console.log(`[BOOKING] CREATED bookingId=${booking.id}`);

    // ── 4. Send confirmation emails (outside transaction) ─────────────────────
    const classroomUrl = buildClassroomUrl(booking.id);
    const startIso = booking.startsAtUtc.toISOString();
    const endIso   = booking.endsAtUtc.toISOString();

    const emailResult = await sendBookingConfirmationEmails({
      bookingId:        booking.id,
      parentName:       booking.parent.name,
      parentEmail:      booking.parent.email,
      mentorName:       booking.mentor.name,
      mentorEmail:      booking.mentor.email,
      parentLocalDate:  formatLocalDate(startIso, booking.parentTimezone),
      parentLocalStart: formatLocalTime(startIso, booking.parentTimezone),
      parentLocalEnd:   formatLocalTime(endIso,   booking.parentTimezone),
      parentTimezone:   booking.parentTimezone,
      mentorLocalDate:  formatLocalDate(startIso, booking.mentorTimezone),
      mentorLocalStart: formatLocalTime(startIso, booking.mentorTimezone),
      mentorLocalEnd:   formatLocalTime(endIso,   booking.mentorTimezone),
      mentorTimezone:   booking.mentorTimezone,
      classroomUrl,
    });

    // ── 5. Persist email delivery status ──────────────────────────────────────
    const sentAt = new Date();
    await prisma.booking
      .update({
        where: { id: booking.id },
        data: {
          parentEmailStatus: emailResult.parent,
          mentorEmailStatus: emailResult.mentor,
          parentEmailSentAt: emailResult.parent === 'SENT' ? sentAt : null,
          mentorEmailSentAt: emailResult.mentor === 'SENT' ? sentAt : null,
        },
      })
      .catch((err: unknown) => {
        // Status update failure must never affect the booking response
        console.error(`[EMAIL] Failed to persist email status bookingId=${booking.id}:`, err);
      });

    return this.toConfirmation(booking, booking.mentor, booking.parent.name, emailResult);
  }

  async getBooking(id: string): Promise<BookingConfirmation> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { mentor: true, parent: true },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found.');
    }

    const b = booking as unknown as BookingWithRelations;
    return this.toConfirmation(b, b.mentor, b.parent.name, {
      parent: (b.parentEmailStatus ?? 'PENDING') as EmailNotificationStatus,
      mentor: (b.mentorEmailStatus ?? 'PENDING') as EmailNotificationStatus,
    });
  }

  private toConfirmation(
    booking: BookingWithRelations,
    mentor: { name: string; timezone: string },
    parentName: string,
    emailNotifications?: { parent: EmailNotificationStatus; mentor: EmailNotificationStatus }
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
      ...(emailNotifications && { emailNotifications }),
    };
  }

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
