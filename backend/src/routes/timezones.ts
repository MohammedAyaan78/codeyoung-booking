import { Router } from 'express';
import { TIMEZONE_OPTIONS } from '../utils/timezoneList';

export const timezonesRouter = Router();

timezonesRouter.get('/', (_req, res) => {
  res.json({ timezones: TIMEZONE_OPTIONS });
});
