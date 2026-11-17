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

async function check() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const rows = await q(`SELECT r.code as role, p.code as permission, p.module FROM auth.roles r JOIN auth.role_permissions rp ON r.id = rp.role_id JOIN auth.permissions p ON rp.permission_id = p.id WHERE r.code IN ('employee', 'reporting_manager', 'hr_admin') ORDER BY r.code, p.code;`);
  console.log(rows);
  await prisma['$disconnect']();
}

check().catch(console.error);
