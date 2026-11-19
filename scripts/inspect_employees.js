const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=employee' } } });

async function inspectEmployees() {
  const emps = await p.$queryRawUnsafe('SELECT id, first_name, last_name, official_email, status FROM employee.employees');
  console.log('Employees in DB count:', emps.length);
  console.log('Employees:', emps);
  await p.$disconnect();
}
inspectEmployees();
