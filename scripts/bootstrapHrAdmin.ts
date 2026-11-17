#!/usr/bin/env node
/**
 * Celestial HRMS - First-Time HR Administrator Bootstrap CLI
 * 
 * Usage:
 *   node bootstrapHrAdmin.js --email admin@company.com
 *   node bootstrapHrAdmin.js --check
 * 
 * Security Controls:
 * - Direct operator invocation only (no unauthenticated public HTTP endpoint).
 * - Checks PostgreSQL state before doing anything.
 * - Concurrency protected via PostgreSQL transactional advisory locks.
 * - Idempotent: Never creates duplicate admins if an active admin already exists.
 * - Safe: Does NOT modify Raseedh or any existing database records.
 * - Zero plaintext passwords stored or logged.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load auth-service environment
dotenv.config({ path: path.resolve(__dirname, '../services/auth-service/.env') });

import { PrismaClient } from '../services/auth-service/src/generated/client';
import { bootstrapHrAdministrator } from '../services/auth-service/src/services/bootstrapService';

async function main() {
  const args = process.argv.slice(2);
  const isCheckOnly = args.includes('--check') || args.includes('-c');
  const emailIdx = args.indexOf('--email');
  const emailArg = emailIdx !== -1 && args[emailIdx + 1] ? args[emailIdx + 1] : process.env.BOOTSTRAP_ADMIN_EMAIL;
  const nameIdx = args.indexOf('--name');
  const nameArg = nameIdx !== -1 && args[nameIdx + 1] ? args[nameIdx + 1] : process.env.BOOTSTRAP_ADMIN_NAME;

  console.log('===============================================================');
  console.log('   CELESTIAL HRMS — FIRST-TIME HR ADMINISTRATOR BOOTSTRAP       ');
  console.log('===============================================================');

  const prisma = new PrismaClient();

  try {
    // 1. Check existing state
    const existingHrAdmin = await prisma.users.findFirst({
      where: {
        roleCode: 'hr_admin',
        status: { in: ['ACTIVE', 'PENDING_ACTIVATION'] },
      },
    });

    if (existingHrAdmin) {
      console.log('\n[STATE: ALREADY INITIALIZED]');
      console.log(`- Existing HR Administrator: ${existingHrAdmin.email}`);
      console.log(`- User ID: ${existingHrAdmin.id}`);
      console.log(`- Status: ${existingHrAdmin.status}`);
      console.log(`- Employee ID: ${existingHrAdmin.employeeId || 'N/A'}`);
      console.log('\nResult: The database is already initialized. Bootstrap aborted safely.');
      console.log('Existing records remain completely untouched.');
      process.exit(0);
    }

    if (isCheckOnly) {
      console.log('\n[STATE: FRESH UNINITIALIZED INSTALLATION]');
      console.log('No active HR Administrator found. The database is ready for initial bootstrap.');
      process.exit(0);
    }

    if (!emailArg) {
      console.error('\n[ERROR: MISSING REQUIRED PARAMETERS]');
      console.error('Please specify the administrator email using:');
      console.error('  --email <administrator@company.com>');
      console.error('\nExample:');
      console.error('  node scripts/bootstrapHrAdmin.js --email hr.lead@company.com --name "HR Lead"');
      process.exit(1);
    }

    console.log(`\nInitiating secure bootstrap for: ${emailArg}`);
    const result = await bootstrapHrAdministrator(
      prisma as any,
      {
        email: emailArg,
        name: nameArg,
      },
      {
        portalBaseUrl: process.env.PORTAL_BASE_URL || process.env.APP_URL || 'http://localhost:3000',
        tokenExpiryHours: 48,
      }
    );

    if (result.status === 'ALREADY_INITIALIZED') {
      console.log(`\n[NOTICE] ${result.message}`);
      process.exit(0);
    }

    console.log('\n===============================================================');
    console.log('   BOOTSTRAP COMPLETED SUCCESSFULLY                            ');
    console.log('===============================================================');
    console.log(`- User ID: ${result.userId}`);
    console.log(`- Official Email: ${result.email}`);
    console.log(`- Assigned Role: ${result.role}`);
    console.log(`- Token Expiration: ${result.activationExpiresAt?.toISOString()}`);
    console.log('\n[OPERATOR ACTION REQUIRED]');
    console.log('Deliver the one-time activation link to the administrator securely:');
    console.log(`\n  Activation URL: ${result.activationUrl}\n`);
    console.log('The administrator must configure their secure password via this link.');
    console.log('Zero plaintext passwords were generated or stored.');
    console.log('===============================================================');
  } catch (err: any) {
    console.error('\n[FATAL ERROR DURING BOOTSTRAP]');
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

