const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../services/auth-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] ? match[2].trim() : '';
    val = val.replace(/^["']|["']$/g, '');
    process.env[match[1]] = val;
  }
});

const { PrismaClient } = require(path.join(__dirname, '../services/auth-service/src/generated/client'));
const prisma = new PrismaClient();

async function checkTables() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const tables = await q(`
    SELECT schemaname::text, tablename::text, tableowner::text
    FROM pg_tables
    WHERE schemaname IN ('auth', 'organization', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification');
  `);
  console.log('Tables created and owners:');
  console.log(JSON.stringify(tables, null, 2));
}

checkTables().finally(async () => {
  await prisma['$disconnect']();
});

