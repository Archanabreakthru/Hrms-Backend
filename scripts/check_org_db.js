const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/organization-service/.env') });
const { PrismaClient } = require('../services/organization-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const schemas = await prisma.$queryRawUnsafe(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('org', 'organization');
  `);
  console.log('Schemas:', schemas);

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('org', 'organization');
  `);
  console.log('Tables:', tables);

  // Check columns of company_profiles in org or organization
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('company_profiles', 'branches', 'departments', 'designations', 'statutory_compliance_configs')
    ORDER BY table_name, ordinal_position;
  `);
  console.log('Columns:', JSON.stringify(cols, null, 2));

  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
