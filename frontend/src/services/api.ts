import {
  AvailabilityResponse,
  BookingConfirmation,
  CreateBookingRequest,
  TimezoneOption,
  AuthUser,
  MentorLoginRequest,
  DashboardBooking,
  MentorCapacity,
  ClassroomDto,
} from '@codeyoung/shared';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: extraHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    credentials: 'include', // always send session cookie
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });

  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  getMe(): Promise<AuthUser> {
    return request('/auth/me');
  },

  parentRegister(body: { name: string; email: string; password: string }): Promise<AuthUser> {
    return request('/auth/parent/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  parentLogin(body: { email: string; password: string }): Promise<AuthUser> {
    return request('/auth/parent/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  mentorLogin(body: MentorLoginRequest): Promise<AuthUser> {
    return request('/auth/mentor/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  logout(): Promise<{ ok: boolean }> {
    return request('/auth/logout', { method: 'POST' });
  },

  // ── Public ────────────────────────────────────────────────────────────────
  getTimezones(): Promise<{ timezones: TimezoneOption[] }> {
    return request('/timezones');
  },

  getAvailability(date: string, timezone: string): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ date, timezone });
    return request(`/availability?${params}`);
  },

  // Legacy unauthenticated booking (kept for backward compat)
  createBooking(body: CreateBookingRequest, idempotencyKey: string): Promise<BookingConfirmation> {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  getBooking(id: string): Promise<BookingConfirmation> {
    return request(`/bookings/${id}`);
  },

  // ── Parent ────────────────────────────────────────────────────────────────
  getParentBookings(): Promise<{ bookings: DashboardBooking[] }> {
    return request('/parent/bookings');
  },

  createAuthenticatedBooking(
    body: { parentTimezone: string; startUtc: string },
    idempotencyKey: string
  ): Promise<BookingConfirmation> {
    return request('/parent/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  getParentProfile(): Promise<AuthUser & { phone: string }> {
    return request('/parent/profile');
  },

  updateParentProfile(data: { name?: string; phone?: string; timezone?: string }): Promise<AuthUser> {
    return request('/parent/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ── Mentor ────────────────────────────────────────────────────────────────
  getMentorBookings(): Promise<{ bookings: DashboardBooking[] }> {
    return request('/mentor/bookings');
  },

  getMentorCapacity(): Promise<MentorCapacity> {
    return request('/mentor/capacity');
  },

  getMentorProfile(): Promise<{ id: string; name: string; email: string; timezone: string; active: boolean }> {
    return request('/mentor/profile');
  },

  // ── Classroom ──────────────────────────────────────────────────────────────
  getClassroom(bookingId: string): Promise<ClassroomDto> {
    return request(`/classes/${bookingId}`);
  },
};
