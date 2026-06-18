import { PrismaClient } from "./prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// This prevents multiple instances of Prisma Client from 
// being created during development hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  // Prisma 7 requires this native adapter to communicate safely with your database
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;