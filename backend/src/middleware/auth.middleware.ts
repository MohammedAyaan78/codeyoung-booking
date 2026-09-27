import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { UserRole } from '@codeyoung/shared';

/**
 * Require an authenticated session. Returns 401 if not logged in.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
  }
  next();
}

/**
 * Require a specific role. Must be used after requireAuth.
 */
export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as { role: UserRole } | undefined;
    if (!user || user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
    }
    next();
  };
}
