const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../services/attendance-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] ? match[2].trim() : '';
    val = val.replace(/^["']|["']$/g, '');
    process.env[match[1]] = val;
  }
});

const { PrismaClient } = require(path.join(__dirname, '../services/attendance-service/src/generated/client'));
const prisma = new PrismaClient();

async function check() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const cols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'employee' AND table_name = 'employees';`);
  console.log('COLUMNS:', cols);
  const fksToEmp = await q(`SELECT tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_schema = 'employee' AND ccu.table_name = 'employees';`);
  console.log('FOREIGN KEYS POINTING TO employee.employees:', fksToEmp);
  await prisma['$disconnect']();
}

check().catch(console.error);
