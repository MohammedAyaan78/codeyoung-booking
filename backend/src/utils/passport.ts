import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';

passport.serializeUser((user: Express.User, done) => {
  const u = user as { id: string; role: string };
  done(null, { id: u.id, role: u.role });
});

passport.deserializeUser(async (payload: { id: string; role: string }, done) => {
  try {
    if (payload.role === 'MENTOR') {
      const mentor = await prisma.mentor.findUnique({ where: { id: payload.id } });
      if (!mentor) return done(null, false);
      return done(null, {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        role: 'MENTOR' as const,
        timezone: mentor.timezone,
        profileImageUrl: null,
      });
    }

    const parent = await prisma.parent.findUnique({ where: { id: payload.id } });
    if (!parent) return done(null, false);
    return done(null, {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      role: 'PARENT' as const,
      timezone: parent.timezone,
      profileImageUrl: parent.profileImageUrl,
    });
  } catch (err) {
    done(err);
  }
});

// ── Google OAuth (parents) ────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          let parent = await prisma.parent.findFirst({
            where: { OR: [{ googleId: profile.id }, { email }] },
          });

          if (parent) {
            if (!parent.googleId) {
              parent = await prisma.parent.update({
                where: { id: parent.id },
                data: {
                  googleId: profile.id,
                  profileImageUrl: profile.photos?.[0]?.value ?? null,
                  name: parent.name || profile.displayName,
                },
              });
            }
          } else {
            parent = await prisma.parent.create({
              data: {
                googleId: profile.id,
                name: profile.displayName,
                email,
                phone: '',
                timezone: 'UTC',
                role: 'PARENT',
                profileImageUrl: profile.photos?.[0]?.value ?? null,
              },
            });
          }

          return done(null, {
            id: parent.id,
            name: parent.name,
            email: parent.email,
            role: 'PARENT' as const,
            timezone: parent.timezone,
            profileImageUrl: parent.profileImageUrl,
          });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ── Local strategy (parents — email + password) ───────────────────────────────

passport.use(
  'parent-local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const parent = await prisma.parent.findUnique({ where: { email } });
        if (!parent || !parent.passwordHash) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        const valid = await bcrypt.compare(password, parent.passwordHash);
        if (!valid) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        return done(null, {
          id: parent.id,
          name: parent.name,
          email: parent.email,
          role: 'PARENT' as const,
          timezone: parent.timezone,
          profileImageUrl: parent.profileImageUrl,
        });
      } catch (err) {
        done(err);
      }
    }
  )
);

// ── Local strategy (mentors — email + password) ───────────────────────────────

passport.use(
  'mentor-local',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const mentor = await prisma.mentor.findUnique({ where: { email } });
        if (!mentor || !mentor.active) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        if (!mentor.passwordHash) {
          return done(null, false, { message: 'Account not configured.' });
        }
        const valid = await bcrypt.compare(password, mentor.passwordHash);
        if (!valid) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        return done(null, {
          id: mentor.id,
          name: mentor.name,
          email: mentor.email,
          role: 'MENTOR' as const,
          timezone: mentor.timezone,
          profileImageUrl: null,
        });
      } catch (err) {
        done(err);
      }
    }
  )
);

export default passport;
