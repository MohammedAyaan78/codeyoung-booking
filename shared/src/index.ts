// ─── Availability ────────────────────────────────────────────────────────────

export interface SlotDto {
  startUtc: string;   // ISO 8601 UTC
  endUtc: string;     // ISO 8601 UTC
  localStart: string; // e.g. "10:30 AM EDT"
  localEnd: string;   // e.g. "11:00 AM EDT"
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;       // YYYY-MM-DD in requested timezone
  timezone: string;   // IANA
  slots: SlotDto[];
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export interface CreateBookingRequest {
  parentTimezone: string;   // IANA
  startUtc: string;         // ISO 8601 UTC — the chosen slot
  // parentName/email/phone now come from the authenticated session on the backend
  // kept optional here for backward-compat with the unauthenticated flow
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export interface BookingConfirmation {
  bookingId: string;
  status: 'CONFIRMED';
  meetingUrl: string;

  parent: {
    name: string;
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };

  mentor: {
    name: string;
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };

  startUtc: string;
  endUtc: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'PARENT' | 'MENTOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  timezone: string;
  profileImageUrl?: string | null;
}

export interface MentorLoginRequest {
  email: string;
  password: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardBooking {
  bookingId: string;
  status: string;
  meetingUrl: string;
  startUtc: string;
  endUtc: string;
  parent: {
    name: string;
    email?: string;       // present in mentor view
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };
  mentor: {
    name: string;
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };
}

export interface MentorCapacity {
  date: string;         // mentor's local date YYYY-MM-DD
  booked: number;
  limit: number;
  remaining: number;
}

// ─── Classroom ──────────────────────────────────────────────────────────────

export type ClassState = 'UPCOMING' | 'JOINABLE' | 'LIVE' | 'ENDED';

export interface ClassroomDto {
  bookingId: string;
  state: ClassState;
  startUtc: string;
  endUtc: string;
  parent: {
    name: string;
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };
  mentor: {
    name: string;
    timezone: string;
    localStart: string;
    localEnd: string;
    localDate: string;
  };
  joinWindowMinutes: number;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export type BookingErrorCode =
  | 'NO_AVAILABILITY'
  | 'SLOT_TAKEN'
  | 'PAST_SLOT'
  | 'INVALID_PAYLOAD'
  | 'DUPLICATE_BOOKING'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

export interface ApiError {
  code: BookingErrorCode | string;
  message: string;
  alternatives?: SlotDto[];
}

export interface ApiErrorResponse {
  error: ApiError;
}

// ─── Timezones ───────────────────────────────────────────────────────────────

export interface TimezoneOption {
  value: string;   // IANA identifier
  label: string;   // Human-readable e.g. "New York — America/New_York"
  offset: string;  // e.g. "UTC-5"
}
