const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '../services/auth-service/.env');
if (fs.existsSync(envFile)) {
  const envText = fs.readFileSync(envFile, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[k] = v;
    }
  }
}

const { PrismaClient } = require('../services/auth-service/src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany({
    select: { id: true, email: true, username: true, roleCode: true, status: true, employeeId: true }
  });
  console.log('Total users:', users.length);
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

