import { PrismaClient } from '../generated/client';

declare global {
  var __authPrismaInstance: PrismaClient | undefined;
}

export const prisma =
  global.__authPrismaInstance ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
  });

if (process.env.NODE_ENV !== 'production') {
  global.__authPrismaInstance = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

