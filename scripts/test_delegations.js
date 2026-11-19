const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/auth-service/.env') });
const { PrismaClient } = require('../services/auth-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function run() {
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM org.delegations');
  console.log('PostgreSQL org.delegations count:', rows.length);
  console.log(rows);
  await prisma.$disconnect();
}

run().catch(console.error);
