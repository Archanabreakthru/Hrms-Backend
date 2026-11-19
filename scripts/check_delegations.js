const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=organization' } } });

async function check() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'organization' AND table_name = 'delegations'
  `);
  console.log('Columns in organization.delegations:', cols);
  const count = await prisma.$queryRawUnsafe(`SELECT count(*) FROM organization.delegations`);
  console.log('Delegations count:', count);
  await prisma.$disconnect();
}
check().catch(console.error);
