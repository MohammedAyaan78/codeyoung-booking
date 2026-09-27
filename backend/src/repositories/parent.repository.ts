import { Parent, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const parentRepository = {
  /**
   * Find or create a parent by email.
   * We upsert to avoid duplicate parent records for the same email.
   */
  upsert(data: {
    name: string;
    email: string;
    phone: string;
    timezone: string;
  }): Promise<Parent> {
    return prisma.parent.upsert({
      where: { email: data.email } as Prisma.ParentWhereUniqueInput,
      update: { name: data.name, phone: data.phone, timezone: data.timezone },
      create: data,
    });
  },

  upsertWithinTransaction(
    tx: Prisma.TransactionClient,
    data: { name: string; email: string; phone: string; timezone: string }
  ): Promise<Parent> {
    return tx.parent.upsert({
      where: { email: data.email } as Prisma.ParentWhereUniqueInput,
      update: { name: data.name, phone: data.phone, timezone: data.timezone },
      create: data,
    });
  },
};
