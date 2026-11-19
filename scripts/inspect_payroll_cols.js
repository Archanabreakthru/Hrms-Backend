const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=payroll' } } });

async function inspectPayroll() {
  const cols = await p.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'payroll' AND table_name = 'salary_structures' ORDER BY ordinal_position`);
  console.log('Columns in payroll.salary_structures:', cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  const rows = await p.$queryRawUnsafe(`SELECT * FROM payroll.salary_structures LIMIT 5`);
  console.log('Sample rows in salary_structures:', rows);
  await p.$disconnect();
}
inspectPayroll();
