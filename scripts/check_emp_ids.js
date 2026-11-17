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
  try {
    const s = await q(`INSERT INTO attendance.shifts (id, code, name, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_threshold_hours, is_overnight, weekly_off_days, is_active) VALUES ('d3b07384-d113-4e00-bf7d-9442fa6054be'::uuid, 'GEN-01', 'General Day Shift', '09:30:00'::time, '18:30:00'::time, 15, 4.5, 8.0, false, ARRAY[0,6], true) ON CONFLICT (code) DO NOTHING RETURNING *;`);
    console.log('INSERT SHIFT RESULT:', s);
  } catch (err) {
    console.error('ERROR CREATING SHIFT VIA RAW SQL:', err);
  }
  await prisma['$disconnect']();
}

check().catch(console.error);
