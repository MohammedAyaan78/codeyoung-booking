import { Mentor } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const mentorRepository = {
  findAllActive(): Promise<Mentor[]> {
    return prisma.mentor.findMany({ where: { active: true } });
  },

  findById(id: string): Promise<Mentor | null> {
    return prisma.mentor.findUnique({ where: { id } });
  },
};
