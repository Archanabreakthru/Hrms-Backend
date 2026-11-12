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
  const user = await prisma.users.findUnique({ where: { email: 'raseedh@orbyx.internal' } });
  console.log('User found:', user ? user.email : 'NOT FOUND');
  if (user) {
    console.log('Stored hash:', user.passwordHash);
    const { AuthService } = require('../services/auth-service/src/services/authService');
    const valid = AuthService.verifyPassword('Raseedh@2026PasswordSetup', user.passwordHash);
    console.log('Verify result:', valid);
  }
}

check().finally(() => prisma['$disconnect']());

