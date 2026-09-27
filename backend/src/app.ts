import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';

import './utils/passport'; // register strategies
import passport from './utils/passport';

import { healthRouter } from './routes/health';
import { timezonesRouter } from './routes/timezones';
import { availabilityRouter } from './routes/availability';
import { bookingsRouter } from './routes/bookings';
import { authRouter } from './routes/auth';
import { parentRouter } from './routes/parent';
import { mentorRouter } from './routes/mentor';
import { classesRouter } from './routes/classes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

export function createApp() {
  const app = express();

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow Google OAuth redirects
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key'],
      credentials: true, // required for cookies
    })
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json());

  // ── Session ───────────────────────────────────────────────────────────────
  app.use(
    session({
      name: 'cy.sid',
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // ── Passport ──────────────────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Rate limiting ─────────────────────────────────────────────────────────
  app.use(
    '/api/bookings',
    rateLimit({
      windowMs: 60_000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    })
  );

  app.use(
    '/api/auth/mentor/login',
    rateLimit({
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts.' } },
    })
  );

  app.use(
    '/api/auth/parent',
    rateLimit({
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts.' } },
    })
  );

  // ── Logging ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/timezones', timezonesRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/bookings', bookingsRouter);   // kept for backward compat
  app.use('/api/auth', authRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/mentor', mentorRouter);
  app.use('/api/classes', classesRouter);

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const PORT = Number(process.env.PORT ?? 4000);
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
}
