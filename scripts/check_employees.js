const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/employee-service/.env') });
const { PrismaClient } = require('../services/employee-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const emps = await prisma.employee.findMany();
  console.log('Total employees in PostgreSQL:', emps.length);
  for (const e of emps) {
    console.log(`- ID: ${e.id}, Name: ${e.firstName} ${e.lastName}, Email: ${e.officialEmail}, ProfileStatus: ${e.profileStatus}, EmploymentStatus: ${e.employmentStatus}, Dept: ${e.departmentId}, Desig: ${e.designationId}`);
  }

  const seqs = await prisma.employeeSequence.findMany();
  console.log('=== SEQUENCES IN POSTGRESQL ===');
  console.log(seqs);
  await prisma.$disconnect();
}
check().catch(e => {
  console.error(e);
  process.exit(1);
});
