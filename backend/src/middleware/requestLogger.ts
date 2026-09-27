import { Request, Response, NextFunction } from 'express';

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, ' ').slice(0, 200);
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${sanitizeForLog(req.path)}`);
  next();
}
