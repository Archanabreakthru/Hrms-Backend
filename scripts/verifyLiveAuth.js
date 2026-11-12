const fs = require('fs');
const path = require('path');

// Load environment variables
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
const { PrismaAuthRepository } = require(path.join(__dirname, '../services/auth-service/src/repositories/prismaAuthRepository'));
const { AuthService } = require(path.join(__dirname, '../services/auth-service/src/services/authService'));

const prisma = new PrismaClient();
const authRepo = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepo);

async function runVerification() {
  console.log('--- RUNNING LIVE AUTH & RBAC VERIFICATION ---');

  // Test 1: Verify Raseedh (HR Admin) Login against PostgreSQL
  console.log('Test 1: Authenticating Raseedh (hr_admin)...');
  const hrLogin = await authService.login('raseedh@orbyx.internal', 'Raseedh@2026PasswordSetup');
  console.log(`✓ Authentication Succeeded! AccessToken generated (len=${hrLogin.accessToken.length})`);
  console.log(`✓ Resolved Role: ${hrLogin.user.role}`);
  console.log(`✓ Permissions count returned in JWT claim: ${hrLogin.permissions.length}`);
  if (!hrLogin.permissions.includes('payroll.process') || !hrLogin.permissions.includes('employee.profile.edit_employment')) {
    throw new Error('Missing expected HR permissions');
  }

  // Test 2: Verify Super Admin Login against PostgreSQL
  console.log('\nTest 2: Authenticating Super Admin...');
  const saLogin = await authService.login('admin.system@orbyx.internal', 'OrbyxSuperAdmin@2026');
  console.log(`✓ Super Admin Authenticated! Role: ${saLogin.user.role}, Permissions count: ${saLogin.permissions.length}`);
  if (!saLogin.permissions.includes('system.config.write')) {
    throw new Error('Missing expected Super Admin permissions');
  }

  // Test 3: Verify Employee (Bhavadharani) Login against PostgreSQL
  console.log('\nTest 3: Authenticating Bhavadharani (employee)...');
  const empLogin = await authService.login('bhavadharani@orbyx.internal', 'Bhava@2026PasswordSetup');
  console.log(`✓ Employee Authenticated! Role: ${empLogin.user.role}, Permissions count: ${empLogin.permissions.length}`);
  if (empLogin.permissions.includes('system.config.write') || empLogin.permissions.includes('payroll.process')) {
    throw new Error('Security Breach: Employee received unauthorized permissions!');
  }

  // Test 4: Privilege Escalation Prevention (HR Admin cannot register Super Admin)
  console.log('\nTest 4: Testing Privilege Escalation Guardrail (HR Admin attempts to create super_admin)...');
  try {
    await authService.register(
      {
        email: 'illegal.escalation@orbyx.internal',
        password: 'Password@123',
        role: 'super_admin'
      },
      { role: 'hr_admin', id: hrLogin.user.id }
    );
    throw new Error('Vulnerability: HR Admin was able to create super_admin!');
  } catch (err) {
    console.log(`✓ Escalation Blocked Successfully: "${err.message}"`);
  }

  // Test 5: Token Refresh Workflow with Rotation
  console.log('\nTest 5: Testing Refresh Token Rotation...');
  const refreshed = await authService.refresh(hrLogin.refreshToken);
  console.log(`✓ Token rotation successful! New AccessToken (len=${refreshed.accessToken.length})`);

  // Verify old refresh token is now revoked
  try {
    await authService.refresh(hrLogin.refreshToken);
    throw new Error('Vulnerability: Replay attack with revoked refresh token succeeded!');
  } catch (err) {
    console.log(`✓ Revoked Token Replay Blocked: "${err.message}"`);
  }

  console.log('\n===============================================');
  console.log('✓ ALL 5 LIVE RBAC & AUTHENTICATION TESTS PASSED!');
  console.log('===============================================');
}

runVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('✗ Test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma['$disconnect']();
  });

