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

async function inspect() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const tables = ['attendance_records', 'shifts', 'shift_schedules', 'attendance_regularizations'];
  for (const t of tables) {
    const cols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'attendance' AND table_name = '${t}';`);
    console.log(`\nTABLE: attendance.${t}`);
    console.log(cols);
  }
  await prisma['$disconnect']();
}

inspect().catch(console.error);

