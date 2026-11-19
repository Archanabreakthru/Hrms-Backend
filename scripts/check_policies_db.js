const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/organization-service/.env') });
const { PrismaClient } = require('../services/organization-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const delCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'organization' AND table_name = 'delegations';
  `);
  console.log('delegations columns:', delCols);

  const polCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'organization' AND table_name = 'policy_rules';
  `);
  console.log('policy_rules columns:', polCols);

  const existingPolicies = await prisma.$queryRawUnsafe(`
    SELECT * FROM organization.policy_rules;
  `);
  console.log('existing policy_rules rows:', existingPolicies);

  const existingDelegations = await prisma.$queryRawUnsafe(`
    SELECT * FROM organization.delegations;
  `);
  console.log('existing delegations rows:', existingDelegations);

  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
