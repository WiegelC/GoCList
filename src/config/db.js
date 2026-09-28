/**
 * Database & ORM Configuration
 * Manages PrismaClient lifecycle, connection pooling, and resilient local fallback.
 */

let prismaInstance = null;

function getPrismaClient() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    if (!prismaInstance) {
      const { PrismaClient } = require('@prisma/client');
      prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
      console.log('🐘 PostgreSQL connected via Prisma ORM');
    }
    return prismaInstance;
  }
  return null;
}

module.exports = {
  getPrismaClient,
  isPostgresActive: () => Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')),
};
