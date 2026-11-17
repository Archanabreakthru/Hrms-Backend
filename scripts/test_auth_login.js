const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const { AuthService } = require('../services/auth-service/src/services/authService');
const { PrismaAuthRepository } = require('../services/auth-service/src/repositories/prismaAuthRepository');

const repo = new PrismaAuthRepository(prisma);
const service = new AuthService(repo);

async function test() {
  const user = await prisma.users.findUnique({
    where: { email: 'arunarchana2034@gmail.com' }
  });
  console.log('User found:', {
    id: user.id,
    email: user.email,
    username: user.username,
    roleCode: user.roleCode,
    status: user.status,
    failedAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil
  });

  const pwCheck1 = AuthService.verifyPassword('Admin@12345', user.passwordHash);
  console.log('Matches Admin@12345?', pwCheck1);
  const pwCheck2 = AuthService.verifyPassword('Admin@123', user.passwordHash);
  console.log('Matches Admin@123?', pwCheck2);
  const pwCheck3 = AuthService.verifyPassword('SuperAdmin@2026', user.passwordHash);
  console.log('Matches SuperAdmin@2026?', pwCheck3);
}

test().catch(console.error).finally(() => prisma.$disconnect());

