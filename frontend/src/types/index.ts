/**
 * Frontend-specific types.
 *
 * Shared API types (SlotDto, BookingConfirmation, etc.) live in @codeyoung/shared.
 * This file contains UI-state types used only in the frontend.
 */

import { SlotDto } from '@codeyoung/shared';
import { ParentDetailsFormData } from '@/features/booking/ParentDetailsForm';

export type BookingStep = 1 | 2 | 3;

export interface BookingFlowState {
  parentDetails: ParentDetailsFormData | null;
  selectedDate: string | null;   // YYYY-MM-DD in parent's timezone
  selectedSlot: SlotDto | null;
  idempotencyKey: string;        // UUID, stable per booking session
}
