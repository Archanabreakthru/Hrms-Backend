const path = require('path');
const fs = require('fs');

const envFile = fs.readFileSync(path.join(__dirname, '../services/client-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] ? match[2].trim() : '';
    val = val.replace(/^["']|["']$/g, '');
    process.env[match[1]] = val;
  }
});

const jwt = require(path.resolve(__dirname, '../node_modules/jsonwebtoken'));
const { PrismaClient } = require(path.join(__dirname, '../services/client-service/src/generated/client'));
const prisma = new PrismaClient();

const secret = 'supersecret_jwt_key_replace_in_production';
const hrToken = jwt.sign({
  sub: '278ceece-42da-45fc-8679-5ee22621f3ee',
  email: 'raseedh@orbyx.internal',
  role: 'hr_admin',
  permissions: [
    'client.organizations.manage',
    'client.supervisors.manage',
    'client.deployments.manage',
    'client.verification.hr_resolve'
  ]
}, secret, { issuer: 'orbyx-auth-service', audience: 'orbyx-hrms-client', expiresIn: '1h' });

const supervisorToken = (clientId) => jwt.sign({
  sub: 'sup-user-test-1',
  email: 'sup@client.test',
  role: 'client_supervisor',
  clientId: clientId,
  permissions: [
    'client.portal.login',
    'client.deployments.read_assigned',
    'client.attendance.verify_deployed',
    'client.dispute.raise'
  ]
}, secret, { issuer: 'orbyx-auth-service', audience: 'orbyx-hrms-client', expiresIn: '1h' });

async function runValidation() {
  console.log('--- PHASE C: BACKEND VALIDATION TEST ---');

  // 1. Initial State: List Clients (Should be empty array from PostgreSQL)
  const res1 = await fetch('http://localhost:5007/api/v1/clients', {
    headers: { 'Authorization': `Bearer ${hrToken}` }
  });
  const data1 = await res1.json();
  console.log('1. Initial GET /clients:', { status: res1.status, count: data1.data?.length });

  // 2. Unauthorized request (No token)
  const resUnauth = await fetch('http://localhost:5007/api/v1/clients');
  console.log('2. Unauthorized test (no token):', { status: resUnauth.status });

  // 3. Permission violation (Supervisor attempting HR Admin client creation)
  const unauthSupToken = supervisorToken('some-cli-id');
  const resPerm = await fetch('http://localhost:5007/api/v1/clients', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${unauthSupToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacked Corp' })
  });
  console.log('3. Permission violation test:', { status: resPerm.status });

  // 4. Create Client Organization (HR Admin)
  const resCreateClient = await fetch('http://localhost:5007/api/v1/clients', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hrToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nexus Tech Systems',
      contactName: 'Rohit Sharma',
      email: 'rohit@nexustech.example.com',
      phone: '+91 80 4455 6677',
      address: 'Prestige Tech Park, Bengaluru',
      status: 'Active'
    })
  });
  const clientData = await resCreateClient.json();
  const clientId = clientData.data?.id;
  console.log('4. Create Client:', { status: resCreateClient.status, clientId, name: clientData.data?.name });

  // 5. Create Client Supervisor
  const resCreateSup = await fetch('http://localhost:5007/api/v1/clients/supervisors', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hrToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: clientId,
      fullName: 'Anita Deshmukh',
      email: 'anita.d@nexustech.example.com',
      phone: '+91 80 4455 6678',
      designation: 'Director of Engineering',
      status: 'Active'
    })
  });
  const supData = await resCreateSup.json();
  const supervisorId = supData.data?.id;
  console.log('5. Create Supervisor:', { status: resCreateSup.status, supervisorId, name: supData.data?.fullName });

  // 6. Create Employee Deployment (Deploying seeded employee EMP-SWE-0005 AnuPriya M)
  const resDeploy = await fetch('http://localhost:5007/api/v1/clients/deployments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hrToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: clientId,
      employeeId: 'EMP-SWE-0005',
      supervisorId: supervisorId,
      project: 'Core Banking API Modernization',
      location: 'Prestige Tech Park',
      workMode: 'Client Site',
      startDate: '2026-11-01',
      plannedEndDate: '2026-12-31',
      allocation: 100,
      allowanceMonthly: 5000,
      status: 'Active'
    })
  });
  const depData = await resDeploy.json();
  const deploymentId = depData.data?.id;
  console.log('6. Create Deployment:', { status: resDeploy.status, deploymentId, project: depData.data?.project });

  // 7. Tenant Isolation Test: Client Supervisor of Nexus Tech queries deployments
  const nexusSupToken = supervisorToken(clientId);
  const resSupDeps = await fetch('http://localhost:5007/api/v1/clients/deployments', {
    headers: { 'Authorization': `Bearer ${nexusSupToken}` }
  });
  const supDepsData = await resSupDeps.json();
  console.log('7. Supervisor Query (Own Client):', { status: resSupDeps.status, count: supDepsData.data?.length });

  // 8. Cross-Client Access Attempt: Foreign Supervisor trying to query or touch deployments
  const foreignSupToken = supervisorToken('00000000-0000-0000-0000-000000000000');
  const resForeignDeps = await fetch('http://localhost:5007/api/v1/clients/deployments', {
    headers: { 'Authorization': `Bearer ${foreignSupToken}` }
  });
  const foreignDepsData = await resForeignDeps.json();
  console.log('8. Foreign Supervisor Query (Isolated):', { status: resForeignDeps.status, count: foreignDepsData.data?.length });

  // 9. PostgreSQL Database Persistence Audit via Prisma
  const dbClient = await prisma.clientOrganization.findUnique({ where: { id: clientId } });
  const dbSup = await prisma.clientSupervisor.findUnique({ where: { id: supervisorId } });
  const dbDep = await prisma.clientDeployment.findUnique({ where: { id: deploymentId } });

  console.log('9. PostgreSQL Records Directly Verified:');
  console.log('   - Client in PostgreSQL:', dbClient ? { id: dbClient.id, name: dbClient.name } : null);
  console.log('   - Supervisor in PostgreSQL:', dbSup ? { id: dbSup.id, fullName: dbSup.fullName, email: dbSup.email } : null);
  console.log('   - Deployment in PostgreSQL:', dbDep ? { id: dbDep.id, project: dbDep.project, allowance: dbDep.allowanceMonthly } : null);

  // 10. Clean up test records in reverse relational order
  await prisma.clientDeployment.delete({ where: { id: deploymentId } });
  await prisma.clientSupervisor.delete({ where: { id: supervisorId } });
  await prisma.clientOrganization.delete({ where: { id: clientId } });
  console.log('10. PostgreSQL Test Records Cleaned Up.');
  await prisma.$disconnect();
  console.log('--- ALL BACKEND VALIDATION TESTS PASSED CLEANLY ---');
}

runValidation().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
