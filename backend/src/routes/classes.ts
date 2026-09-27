import { Router, Request, Response, NextFunction } from 'express';
import { DateTime } from 'luxon';
import { requireAuth } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { AuthUser, ClassState, ClassroomDto } from '@codeyoung/shared';
import { AppError } from '../middleware/errorHandler';
import { formatLocalTime, formatLocalDate } from '../utils/timezone';

export const classesRouter = Router();

const JOIN_WINDOW_MINUTES = Number(process.env.JOIN_WINDOW_BEFORE_MINUTES ?? 10);

function computeState(startsAtUtc: Date, endsAtUtc: Date): ClassState {
  const now = DateTime.utc();
  const start = DateTime.fromJSDate(startsAtUtc, { zone: 'utc' });
  const end = DateTime.fromJSDate(endsAtUtc, { zone: 'utc' });

  if (now >= end) return 'ENDED';
  if (now >= start) return 'LIVE';
  if (now >= start.minus({ minutes: JOIN_WINDOW_MINUTES })) return 'JOINABLE';
  return 'UPCOMING';
}

// GET /api/classes/:bookingId
// Requires auth. Parent must own the booking; mentor must be assigned to it.
classesRouter.get('/:bookingId', requireAuth, async (req: Request<{ bookingId: string }>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        parent: { select: { id: true, name: true } },
        mentor: { select: { id: true, name: true } },
      },
    });

    if (!booking) return next(new AppError(404, 'NOT_FOUND', 'Class not found.'));

    if (user.role === 'PARENT' && booking.parentId !== user.id) {
      return next(new AppError(403, 'FORBIDDEN', 'Access denied.'));
    }
    if (user.role === 'MENTOR' && booking.mentorId !== user.id) {
      return next(new AppError(403, 'FORBIDDEN', 'Access denied.'));
    }

    const startIso = booking.startsAtUtc.toISOString();
    const endIso = booking.endsAtUtc.toISOString();
    const state = computeState(booking.startsAtUtc, booking.endsAtUtc);

    const dto: ClassroomDto = {
      bookingId: booking.id,
      state,
      startUtc: startIso,
      endUtc: endIso,
      joinWindowMinutes: JOIN_WINDOW_MINUTES,
      parent: {
        name: booking.parent.name,
        timezone: booking.parentTimezone,
        localStart: formatLocalTime(startIso, booking.parentTimezone),
        localEnd: formatLocalTime(endIso, booking.parentTimezone),
        localDate: formatLocalDate(startIso, booking.parentTimezone),
      },
      mentor: {
        name: booking.mentor.name,
        timezone: booking.mentorTimezone,
        localStart: formatLocalTime(startIso, booking.mentorTimezone),
        localEnd: formatLocalTime(endIso, booking.mentorTimezone),
        localDate: formatLocalDate(startIso, booking.mentorTimezone),
      },
    };

    res.json(dto);
  } catch (err) { next(err); }
});
