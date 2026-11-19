const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=employee' } } });

async function inspectCols() {
  const cols = await p.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'employee' AND table_name = 'employees' ORDER BY ordinal_position`);
  console.log('Columns in employee.employees:', cols.map(c => `${c.column_name} (${c.data_type})`).join('\n'));
  const all = await p.$queryRawUnsafe(`SELECT * FROM employee.employees LIMIT 5`);
  console.log('Sample row:', all[0]);
  console.log('Total count:', all.length);
  await p.$disconnect();
}
inspectCols();
