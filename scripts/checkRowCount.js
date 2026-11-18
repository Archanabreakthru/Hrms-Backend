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

async function checkRowCount() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const tables = [
    'auth.roles',
    'auth.permissions',
    'auth.role_permissions',
    'auth.users',
    'auth.user_roles',
    'auth.auth_sessions',
    'org.departments',
    'org.designations',
    'employee.employees'
  ];

  const report = [];
  for (const t of tables) {
    try {
      const res = await q(`SELECT count(*)::int as count FROM ${t};`);
      report.push({ table: t, row_count: res[0].count });
    } catch (e) {
      report.push({ table: t, error: e.message });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

checkRowCount().finally(async () => {
  await prisma['$disconnect']();
});

