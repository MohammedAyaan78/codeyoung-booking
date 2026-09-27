import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createBookingSchema } from '../validators/booking.validator';
import { bookingService } from '../services/booking.service';
/**
 * BookingController
 *
 * Thin HTTP layer — validates input, extracts headers, delegates to BookingService.
 * No business logic lives here.
 */
export const bookingController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawKey = req.headers['idempotency-key'];
      const key: string = ([] as string[]).concat(rawKey ?? [])[0] ?? uuidv4();

      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid booking request.',
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      const confirmation = await bookingService.createBooking(parsed.data, key);
      res.status(201).json(confirmation);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const confirmation = await bookingService.getBooking(req.params.id);
      res.json(confirmation);
    } catch (err) {
      next(err);
    }
  },
};
