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
const { PrismaAuthRepository } = require('../services/auth-service/src/repositories/prismaAuthRepository');
const repo = new PrismaAuthRepository(prisma);

async function test() {
  const user1 = await repo.findUserByEmail('arunarchana2034@gmail.com');
  console.log('Lookup by email:', user1 ? { id: user1.id, email: user1.email, role: user1.role } : null);

  const user2 = await repo.findUserByEmail('bootstrap_admin');
  console.log('Lookup by username (bootstrap_admin):', user2 ? { id: user2.id, email: user2.email, role: user2.role } : null);
}

test().catch(console.error).finally(() => prisma.$disconnect());

