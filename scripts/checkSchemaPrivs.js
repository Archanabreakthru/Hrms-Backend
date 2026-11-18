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

async function checkPrivileges() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const schemas = ['auth', 'organization', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification', 'public'];
  const results = [];
  for (const s of schemas) {
    try {
      const res = await q(`SELECT '${s}' as schema, has_schema_privilege('hrms', '${s}', 'USAGE')::text as usage, has_schema_privilege('hrms', '${s}', 'CREATE')::text as create;`);
      results.push(res[0]);
    } catch (e) {
      results.push({ schema: s, error: e.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));

  // Check if hrms user is superuser or can alter schema
  const userRole = await q(`SELECT rolname::text, rolsuper::text, rolcreaterole::text, rolcreatedb::text FROM pg_roles WHERE rolname = 'hrms';`);
  console.log('User roles:');
  console.log(JSON.stringify(userRole, null, 2));
}

checkPrivileges().finally(async () => {
  await prisma['$disconnect']();
});

