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
  const users = await q(`SELECT u.id, u.email, r.name as role FROM auth.users u LEFT JOIN auth.user_roles ur ON u.id = ur.user_id LEFT JOIN auth.roles r ON ur.role_id = r.id;`);
  console.log(users);
  await prisma['$disconnect']();
}

check().catch(console.error);
