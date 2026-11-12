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

async function alignColumns() {
  const q = prisma['$executeRawUnsafe'].bind(prisma);
  console.log('Adding missing columns to auth.users if not present...');
  await q(`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS department_id VARCHAR(50);`);
  await q(`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS client_id VARCHAR(50);`);
  console.log('✓ Columns aligned.');
}

alignColumns()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma['$disconnect']();
  });

