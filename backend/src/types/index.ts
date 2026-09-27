/**
 * Backend-internal types.
 *
 * DTOs shared with the frontend live in @codeyoung/shared.
 * This file contains types used only within the backend.
 */

/** Represents a mentor's eligibility result during assignment. */
export interface MentorCandidate {
  mentorId: string;
  bookingCountToday: number;
}

/** Structured error payload returned by AppError extras. */
export interface ErrorExtras {
  alternatives?: import('@codeyoung/shared').SlotDto[];
  details?: unknown;
}
