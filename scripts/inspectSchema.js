
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

async function inspectSchema() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const schemas = await q(`
    SELECT nspname::text, rolname::text
    FROM pg_namespace n 
    JOIN pg_roles r ON n.nspowner = r.oid 
    WHERE nspname IN ('auth', 'organization', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification', 'public');
  `);
  console.log('Schemas and owners:');
  console.log(JSON.stringify(schemas, null, 2));

  const privs = await q(`
    SELECT has_schema_privilege('hrms', 'auth', 'USAGE')::text as auth_usage,
           has_schema_privilege('hrms', 'auth', 'CREATE')::text as auth_create;
  `);
  console.log('hrms permissions on auth:');
  console.log(JSON.stringify(privs, null, 2));
}

inspectSchema().finally(async () => {
  await prisma['$disconnect']();
});
