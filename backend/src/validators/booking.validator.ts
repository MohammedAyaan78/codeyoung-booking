import { z } from 'zod';
import { isValidIanaTimezone } from '../utils/timezone';

const ianaTimezone = z.string().refine(isValidIanaTimezone, {
  message: 'Must be a valid IANA timezone identifier (e.g. America/New_York)',
});

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  timezone: ianaTimezone,
});

export const createBookingSchema = z.object({
  parentName: z.string().min(1).max(100),
  parentEmail: z.string().email(),
  parentPhone: z.string().regex(/^\+?[\d\s\-().]{7,20}$/, 'Must be a valid phone number').or(z.literal('')),
  parentTimezone: ianaTimezone,
  startUtc: z.string().datetime({ offset: true, message: 'startUtc must be a valid ISO 8601 UTC datetime' }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
