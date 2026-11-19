const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/auth-service/.env') });
const { PrismaClient } = require('../services/auth-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name ILIKE '%doc%' OR column_name ILIKE '%file%' OR table_name ILIKE '%doc%'
    ORDER BY table_schema, table_name;
  `);
  console.log('Document-related tables/columns in PostgreSQL:');
  console.log(JSON.stringify(tables, null, 2));
  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
