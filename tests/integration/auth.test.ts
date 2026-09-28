/**
 * Authorization integration tests.
 *
 * Tests RBAC: parent vs mentor access, unauthenticated access,
 * and cross-user data isolation.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import request from 'supertest';
import { createApp } from '../../backend/src/app';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

jest.mock('../../backend/src/utils/email', () => {
  const original = jest.requireActual('../../backend/src/utils/email');
  return {
    ...original,
    sendBookingConfirmationEmails: jest.fn().mockResolvedValue({
      parent: 'SENT',
      mentor: 'SENT',
    }),
  };
});

const app = createApp();
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTestMentor(email: string) {
  const hash = await bcrypt.hash('TestPass123!', 10);
  return prisma.mentor.upsert({
    where: { email },
    update: { passwordHash: hash, active: true },
    create: { name: 'Test Mentor', email, timezone: 'Asia/Kolkata', active: true, role: 'MENTOR', passwordHash: hash },
  });
}

async function createTestParent(email: string) {
  return prisma.parent.upsert({
    where: { email },
    update: {},
    create: { name: 'Test Parent', email, phone: '', timezone: 'America/New_York', role: 'PARENT', googleId: `google-${Date.now()}` },
  });
}

async function getMentorSession(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/mentor/login')
    .send({ email, password: 'TestPass123!' });
  const cookie = res.headers['set-cookie'];
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

afterAll(async () => {
  await prisma.$disconnect();
});

// ── Unauthenticated access ────────────────────────────────────────────────────

describe('Unauthenticated access', () => {
  it('GET /api/auth/me returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/parent/bookings returns 401', async () => {
    const res = await request(app).get('/api/parent/bookings');
    expect(res.status).toBe(401);
  });

  it('GET /api/mentor/bookings returns 401', async () => {
    const res = await request(app).get('/api/mentor/bookings');
    expect(res.status).toBe(401);
  });

  it('GET /api/mentor/capacity returns 401', async () => {
    const res = await request(app).get('/api/mentor/capacity');
    expect(res.status).toBe(401);
  });
});

// ── Mentor authentication ─────────────────────────────────────────────────────

describe('Mentor authentication', () => {
  const email = `auth-test-mentor-${Date.now()}@test.local`;

  beforeAll(() => createTestMentor(email));
  afterAll(() => prisma.mentor.delete({ where: { email } }));

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/mentor/login')
      .send({ email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('accepts valid credentials and returns user without passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/mentor/login')
      .send({ email, password: 'TestPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MENTOR');
    expect(res.body.email).toBe(email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('GET /api/auth/me returns mentor after login', async () => {
    const cookie = await getMentorSession(email);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('MENTOR');
  });

  it('POST /api/auth/logout clears session', async () => {
    const cookie = await getMentorSession(email);
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    // After logout, same cookie should not authenticate
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

// ── Role-based access control ─────────────────────────────────────────────────

describe('RBAC — mentor cannot access parent routes', () => {
  const email = `rbac-mentor-${Date.now()}@test.local`;
  let cookie: string;

  beforeAll(async () => {
    await createTestMentor(email);
    cookie = await getMentorSession(email);
  });
  afterAll(() => prisma.mentor.delete({ where: { email } }));

  it('mentor cannot POST /api/parent/bookings', async () => {
    const res = await request(app)
      .post('/api/parent/bookings')
      .set('Cookie', cookie)
      .send({ parentTimezone: 'America/New_York', startUtc: new Date(Date.now() + 86400000).toISOString() });
    expect(res.status).toBe(403);
  });

  it('mentor cannot GET /api/parent/bookings', async () => {
    const res = await request(app).get('/api/parent/bookings').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('mentor cannot GET /api/parent/profile', async () => {
    const res = await request(app).get('/api/parent/profile').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — mentor can access own data only', () => {
  const email = `rbac-mentor2-${Date.now()}@test.local`;
  let cookie: string;

  beforeAll(async () => {
    await createTestMentor(email);
    cookie = await getMentorSession(email);
  });
  afterAll(() => prisma.mentor.delete({ where: { email } }));

  it('mentor can GET /api/mentor/bookings', async () => {
    const res = await request(app).get('/api/mentor/bookings').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });

  it('mentor can GET /api/mentor/capacity', async () => {
    const res = await request(app).get('/api/mentor/capacity').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('booked');
    expect(res.body).toHaveProperty('limit');
  });

  it('mentor can GET /api/mentor/profile', async () => {
    const res = await request(app).get('/api/mentor/profile').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.passwordHash).toBeUndefined();
  });
});
