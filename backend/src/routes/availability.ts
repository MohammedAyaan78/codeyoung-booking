import { Router } from 'express';
import { availabilityController } from '../controllers/availability.controller';

export const availabilityRouter = Router();

availabilityRouter.get('/', availabilityController.getSlots);
