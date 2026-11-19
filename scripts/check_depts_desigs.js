const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/organization-service/.env') });
const { PrismaClient } = require('../services/organization-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const depts = await prisma.departments.findMany();
  console.log('Departments in DB:');
  for (const d of depts) {
    console.log(`- ID: ${d.id}, Code: ${d.code}, Name: ${d.name}, BranchId: ${d.branchId}`);
  }

  const desigs = await prisma.designations.findMany();
  console.log('\nDesignations in DB:');
  for (const ds of desigs) {
    console.log(`- ID: ${ds.id}, Code: ${ds.code}, Title: ${ds.title}, DepartmentId: ${ds.departmentId}, Level: ${ds.level}`);
  }

  await prisma.$disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
