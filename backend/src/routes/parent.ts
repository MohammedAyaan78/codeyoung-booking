import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { bookingService } from '../services/booking.service';
import { prisma } from '../utils/prisma';
import { AuthUser } from '@codeyoung/shared';
import { AppError } from '../middleware/errorHandler';
import { formatLocalTime, formatLocalDate } from '../utils/timezone';
import { z } from 'zod';
import { isValidIanaTimezone } from '../utils/timezone';

export const parentRouter = Router();

// All parent routes require auth + PARENT role
parentRouter.use(requireAuth, requireRole('PARENT'));

// ── GET /api/parent/profile ───────────────────────────────────────────────────

parentRouter.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const parent = await prisma.parent.findUnique({ where: { id: user.id } });
    if (!parent) return next(new AppError(404, 'NOT_FOUND', 'Parent not found.'));

    res.json({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      timezone: parent.timezone,
      profileImageUrl: parent.profileImageUrl,
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/parent/profile ─────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().refine(isValidIanaTimezone, { message: 'Invalid IANA timezone' }).optional(),
});

parentRouter.patch('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'INVALID_PAYLOAD', 'Invalid profile data.'));
    }

    const updated = await prisma.parent.update({
      where: { id: user.id },
      data: parsed.data,
    });

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      timezone: updated.timezone,
    });
  } catch (err) { next(err); }
});

// ── GET /api/parent/bookings ──────────────────────────────────────────────────

parentRouter.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;

    const bookings = await prisma.booking.findMany({
      where: { parentId: user.id },
      include: { mentor: { select: { name: true, timezone: true } } },
      orderBy: { startsAtUtc: 'desc' },
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
          name: user.name,
          timezone: b.parentTimezone,
          localStart: formatLocalTime(startIso, b.parentTimezone),
          localEnd:   formatLocalTime(endIso,   b.parentTimezone),
          localDate:  formatLocalDate(startIso, b.parentTimezone),
        },
        mentor: {
          name: b.mentor.name,
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

// ── POST /api/parent/bookings ─────────────────────────────────────────────────
// Authenticated booking — parentId comes from session, not request body.

import { createBookingSchema } from '../validators/booking.validator';
import { v4 as uuidv4 } from 'uuid';

parentRouter.post('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;

    // Get the parent record to fill in name/email/phone
    const parent = await prisma.parent.findUnique({ where: { id: user.id } });
    if (!parent) return next(new AppError(404, 'NOT_FOUND', 'Parent not found.'));

    const rawKey = req.headers['idempotency-key'];
    const key: string = (typeof rawKey === 'string' ? rawKey : rawKey?.[0]) ?? uuidv4();

    // Merge session identity into the booking input
    const bodyWithIdentity = {
      parentName: parent.name || user.name,
      parentEmail: parent.email,
      parentPhone: parent.phone || '',
      parentTimezone: req.body.parentTimezone,
      startUtc: req.body.startUtc,
    };

    const parsed = createBookingSchema.safeParse(bodyWithIdentity);
    if (!parsed.success) {
      return next(new AppError(400, 'INVALID_PAYLOAD', 'Invalid booking request.'));
    }

    const confirmation = await bookingService.createBooking(parsed.data, key);
    res.status(201).json(confirmation);
  } catch (err) { next(err); }
});

// ── GET /api/parent/bookings/:id ──────────────────────────────────────────────

parentRouter.get('/bookings/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const user = req.user as AuthUser;
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { mentor: true },
    });

    if (!booking) return next(new AppError(404, 'NOT_FOUND', 'Booking not found.'));
    // Ensure parent can only see their own booking
    if (booking.parentId !== user.id) {
      return next(new AppError(403, 'FORBIDDEN', 'Access denied.'));
    }

    const confirmation = await bookingService.getBooking(req.params.id);
    res.json(confirmation);
  } catch (err) { next(err); }
});
