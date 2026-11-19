const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/organization-service/.env') });
const { PrismaClient } = require('../services/organization-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const configs = await prisma.statutoryComplianceConfigs.findMany();
  console.log('statutory_compliance_configs:', configs);
  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
