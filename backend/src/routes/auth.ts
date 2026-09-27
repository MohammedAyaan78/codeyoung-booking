import { Router, Request, Response, NextFunction } from 'express';
import passport from '../utils/passport';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { AuthUser } from '@codeyoung/shared';
import { prisma } from '../utils/prisma';

export const authRouter = Router();

const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    profileImageUrl: user.profileImageUrl ?? null,
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('cy.sid');
      res.json({ ok: true });
    });
  });
});

// ── Google OAuth (parents) ────────────────────────────────────────────────────

authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND}/login?error=google_failed`,
    session: true,
  }),
  (_req: Request, res: Response) => {
    res.redirect(`${FRONTEND}/parent`);
  }
);

// ── Parent register (email + password) ───────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post('/parent/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Invalid input.';
      return next(new AppError(400, 'INVALID_PAYLOAD', msg));
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.parent.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return next(new AppError(409, 'CONFLICT', 'An account with this email already exists. Please sign in.'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // If Google-linked account exists, add password to it; otherwise create new
    const parent = existing
      ? await prisma.parent.update({ where: { id: existing.id }, data: { passwordHash, name } })
      : await prisma.parent.create({
          data: { name, email, passwordHash, phone: '', timezone: 'UTC', role: 'PARENT' },
        });

    const user: AuthUser = {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      role: 'PARENT',
      timezone: parent.timezone,
      profileImageUrl: null,
    };

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  } catch (err) { next(err); }
});

// ── Parent login (email + password) ──────────────────────────────────────────

authRouter.post(
  '/parent/login',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'parent-local',
      (err: Error | null, user: AuthUser | false, info: { message: string } | undefined) => {
        if (err) return next(err);
        if (!user) {
          return next(new AppError(401, 'UNAUTHORIZED', info?.message ?? 'Invalid credentials.'));
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            timezone: user.timezone,
            profileImageUrl: user.profileImageUrl ?? null,
          });
        });
      }
    )(req, res, next);
  }
);

// ── Mentor login (email + password) ──────────────────────────────────────────

authRouter.post(
  '/mentor/login',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'mentor-local',
      (err: Error | null, user: AuthUser | false, info: { message: string } | undefined) => {
        if (err) return next(err);
        if (!user) {
          return next(new AppError(401, 'UNAUTHORIZED', info?.message ?? 'Invalid credentials.'));
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            timezone: user.timezone,
            profileImageUrl: null,
          });
        });
      }
    )(req, res, next);
  }
);
