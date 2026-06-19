import { PrismaClient } from "./prisma-client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  // 1. Create a pg pool using the pooled Neon connection string
  const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
  
  // 2. Pass the pool to the adapter
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;