import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../services/auth-service/.env') });

import { PrismaClient } from '../services/auth-service/src/generated/client';
import { bootstrapDedicatedAdministrator } from '../services/auth-service/src/services/bootstrapService';

const prisma = new PrismaClient();

async function runCli() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  const targetEmail = 'arunarchana2034@gmail.com';
  const operatorIdentifier = 'admin.system@orbyx.internal';

  console.log('----------------------------------------------------');
  console.log('CELESTIAL HRMS — DEDICATED BOOTSTRAP PROVISIONING CLI');
  console.log('----------------------------------------------------');

  if (isCheckMode) {
    const existing = await prisma.users.findUnique({ where: { email: targetEmail } });
    const existingUsername = await prisma.users.findFirst({ where: { username: 'bootstrap_admin' } });
    if (existing || existingUsername) {
      console.log(`[STATUS] Bootstrap administrator is already registered in database.`);
    } else {
      console.log(`[STATUS] Ready for provisioning: ${targetEmail} is not registered.`);
    }
    return;
  }

  // Operator verification: check that authorized operator exists and holds super_admin role
  const operatorUser = await prisma.users.findFirst({
    where: { email: operatorIdentifier, roleCode: 'super_admin', status: 'ACTIVE' },
  });

  if (!operatorUser) {
    throw new Error(`Operator authorization failed: Active super_admin ${operatorIdentifier} not found in database.`);
  }

  console.log(`[OPERATOR] Verified operator identity: ${operatorUser.email} (${operatorUser.id})`);

  const portalBaseUrl = process.env.PORTAL_BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  const result = await bootstrapDedicatedAdministrator(
    prisma as any,
    {
      email: targetEmail,
      authorizedBy: operatorUser.email,
    },
    { portalBaseUrl, tokenExpiryHours: 48 }
  );

  console.log('----------------------------------------------------');
  console.log(`PROVISIONING RESULT: ${result.status}`);
  console.log(`Message: ${result.message}`);
  if (result.userId) {
    console.log(`User ID: ${result.userId}`);
    console.log(`Email: ${result.email}`);
    console.log(`Role: ${result.role}`);
    console.log(`Activation Expires At: ${result.activationExpiresAt}`);
    console.log(`[SECURE DISPATCH] Activation token generated and hashed.`);
  }
  console.log('----------------------------------------------------');
}

runCli()
  .catch((err) => {
    console.error('[ERROR]', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

