import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';

export const bookingsRouter = Router();

/**
 * POST /api/bookings
 *
 * Idempotency-Key header is required. If the same key is sent twice,
 * the original booking is returned without creating a duplicate.
 */
bookingsRouter.post('/', bookingController.create);

/**
 * GET /api/bookings/:id
 */
bookingsRouter.get('/:id', bookingController.getById);
