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

async function checkOwnershipAndPrivs() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const tables = await q(`
    SELECT schemaname::text, tablename::text, tableowner::text 
    FROM pg_tables 
    WHERE schemaname IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification');
  `);
  console.log('Total tables currently created:', tables.length);
  const owners = {};
  tables.forEach(t => {
    owners[t.tableowner] = (owners[t.tableowner] || 0) + 1;
  });
  console.log('Ownership distribution:', JSON.stringify(owners, null, 2));

  const schemas = await q(`
    SELECT nspname::text, rolname::text 
    FROM pg_namespace n 
    JOIN pg_roles r ON n.nspowner = r.oid 
    WHERE nspname IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification');
  `);
  console.log('Schemas and owners:');
  console.log(JSON.stringify(schemas, null, 2));
}

checkOwnershipAndPrivs().finally(async () => {
  await prisma['$disconnect']();
});

