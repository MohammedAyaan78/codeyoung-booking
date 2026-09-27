import { Request, Response, NextFunction } from 'express';
import { availabilityQuerySchema } from '../validators/booking.validator';
import { availabilityService } from '../services/availability.service';

/**
 * AvailabilityController
 *
 * Thin HTTP layer for availability queries.
 */
export const availabilityController = {
  async getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = availabilityQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid query parameters.',
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      const { date, timezone } = parsed.data;
      const slots = await availabilityService.getAvailableSlots(date, timezone);
      res.json({ date, timezone, slots });
    } catch (err) {
      next(err);
    }
  },
};
