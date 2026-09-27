import { Router, Request, Response, NextFunction } from 'express';
import { DateTime } from 'luxon';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma';
import { AuthUser } from '@codeyoung/shared';
import { AppError } from '../middleware/errorHandler';
import { formatLocalTime, formatLocalDate, MAX_BOOKINGS_PER_MENTOR_PER_DAY } from '../utils/timezone';

export const mentorRouter = Router();

// All mentor routes require auth + MENTOR role
mentorRouter.use(requireAuth, requireRole('MENTOR'));

// ── GET /api/mentor/profile ───────────────────────────────────────────────────

mentorRouter.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const mentor = await prisma.mentor.findUnique({ where: { id: user.id } });
    if (!mentor) return next(new AppError(404, 'NOT_FOUND', 'Mentor not found.'));

    // Never return passwordHash
    res.json({
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      timezone: mentor.timezone,
      active: mentor.active,
    });
  } catch (err) { next(err); }
});

// ── GET /api/mentor/bookings ──────────────────────────────────────────────────
// Returns only THIS mentor's bookings — identity from session.

mentorRouter.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;

    const bookings = await prisma.booking.findMany({
      where: { mentorId: user.id, status: 'CONFIRMED' },
      include: { parent: { select: { name: true, email: true, timezone: true } } },
      orderBy: { startsAtUtc: 'asc' },
    });

    const result = bookings.map((b) => {
      const startIso = b.startsAtUtc.toISOString();
      const endIso   = b.endsAtUtc.toISOString();
      return {
        bookingId: b.id,
        status: b.status,
        meetingUrl: b.meetingUrl,
        startUtc: startIso,
        endUtc: endIso,
        parent: {
          name: b.parent.name,
          email: b.parent.email,
          timezone: b.parentTimezone,
          localStart: formatLocalTime(startIso, b.parentTimezone),
          localEnd:   formatLocalTime(endIso,   b.parentTimezone),
          localDate:  formatLocalDate(startIso, b.parentTimezone),
        },
        mentor: {
          name: user.name,
          timezone: b.mentorTimezone,
          localStart: formatLocalTime(startIso, b.mentorTimezone),
          localEnd:   formatLocalTime(endIso,   b.mentorTimezone),
          localDate:  formatLocalDate(startIso, b.mentorTimezone),
        },
      };
    });

    res.json({ bookings: result });
  } catch (err) { next(err); }
});

// ── GET /api/mentor/capacity ──────────────────────────────────────────────────
// Returns today's booking count in the mentor's local timezone.

mentorRouter.get('/capacity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const mentor = await prisma.mentor.findUnique({ where: { id: user.id } });
    if (!mentor) return next(new AppError(404, 'NOT_FOUND', 'Mentor not found.'));

    const now = DateTime.now().setZone(mentor.timezone);
    const dayStart = now.startOf('day').toUTC().toJSDate();
    const dayEnd   = now.endOf('day').toUTC().toJSDate();

    const booked = await prisma.booking.count({
      where: {
        mentorId: mentor.id,
        status: 'CONFIRMED',
        startsAtUtc: { gte: dayStart, lte: dayEnd },
      },
    });

    res.json({
      date: now.toISODate(),
      booked,
      limit: MAX_BOOKINGS_PER_MENTOR_PER_DAY,
      remaining: Math.max(0, MAX_BOOKINGS_PER_MENTOR_PER_DAY - booked),
    });
  } catch (err) { next(err); }
});
