const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/organization-service/.env') });
const { PrismaClient } = require('../services/organization-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const orgProfiles = await prisma.$queryRawUnsafe(`SELECT * FROM org.company_profiles;`);
  console.log('org.company_profiles:', orgProfiles);

  const organizationProfiles = await prisma.$queryRawUnsafe(`SELECT * FROM organization.company_profiles;`);
  console.log('organization.company_profiles:', organizationProfiles);

  const branches = await prisma.$queryRawUnsafe(`SELECT * FROM organization.branches;`);
  console.log('organization.branches:', branches);

  const orgBranches = await prisma.$queryRawUnsafe(`SELECT * FROM org.branches;`);
  console.log('org.branches:', orgBranches);

  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
