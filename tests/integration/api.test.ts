/**
 * API route integration tests using supertest.
 * Tests the HTTP layer: validation, status codes, response shapes.
 */

import request from 'supertest';
import { createApp } from '../../backend/src/app';
import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const app = createApp();
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/timezones', () => {
  it('returns a list of timezone options', async () => {
    const res = await request(app).get('/api/timezones');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.timezones)).toBe(true);
    expect(res.body.timezones.length).toBeGreaterThan(0);
    expect(res.body.timezones[0]).toHaveProperty('value');
    expect(res.body.timezones[0]).toHaveProperty('label');
  });
});

describe('GET /api/availability', () => {
  it('returns slots for a valid future date', async () => {
    const tomorrow = DateTime.now().plus({ days: 1 }).toISODate();
    const res = await request(app)
      .get('/api/availability')
      .query({ date: tomorrow, timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(tomorrow);
    expect(res.body.timezone).toBe('America/New_York');
    expect(Array.isArray(res.body.slots)).toBe(true);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .get('/api/availability')
      .query({ date: 'not-a-date', timezone: 'America/New_York' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns 400 for invalid timezone', async () => {
    const tomorrow = DateTime.now().plus({ days: 1 }).toISODate();
    const res = await request(app)
      .get('/api/availability')
      .query({ date: tomorrow, timezone: 'UTC-5' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });
});

describe('POST /api/bookings', () => {
  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Idempotency-Key', 'test-missing-fields')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Idempotency-Key', 'test-bad-email')
      .send({
        parentName: 'Test',
        parentEmail: 'not-an-email',
        parentPhone: '+1 555 000 0000',
        parentTimezone: 'America/New_York',
        startUtc: DateTime.now().plus({ days: 1 }).toISO(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns 400 for past slot', async () => {
    const pastSlot = DateTime.now().minus({ hours: 2 }).toISO();
    const res = await request(app)
      .post('/api/bookings')
      .set('Idempotency-Key', `test-past-${Date.now()}`)
      .send({
        parentName: 'Test Parent',
        parentEmail: `test-past-${Date.now()}@test.local`,
        parentPhone: '+1 555 000 0000',
        parentTimezone: 'America/New_York',
        startUtc: pastSlot,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAST_SLOT');
  });

  it('returns 400 for invalid IANA timezone', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Idempotency-Key', `test-bad-tz-${Date.now()}`)
      .send({
        parentName: 'Test Parent',
        parentEmail: `test-tz-${Date.now()}@test.local`,
        parentPhone: '+1 555 000 0000',
        parentTimezone: 'EST', // Not a valid IANA zone
        startUtc: DateTime.now().plus({ days: 1 }).toISO(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });
});

describe('GET /api/bookings/:id', () => {
  it('returns 404 for non-existent booking', async () => {
    const res = await request(app).get('/api/bookings/nonexistent-id-12345');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
