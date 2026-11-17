const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/auth-service/.env') });

const { PrismaClient: AuthPrismaClient } = require('../services/auth-service/src/generated/client');
const { PrismaClient: RootPrismaClient } = require('../node_modules/.prisma/client');

const authPrisma = new AuthPrismaClient();
const employeePrisma = new RootPrismaClient();

async function postVerification() {
  console.log('=== POST-PROVISIONING AUDIT VERIFICATION ===');
  
  // 1. All users in auth.users
  const allUsers = await authPrisma.users.findMany({
    orderBy: { email: 'asc' },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  console.log('Total authentication users:', allUsers.length);
  assert(allUsers.length === 12, 'Expected exactly 12 authentication users');

  // Baseline 11 user check
  const baselineUsers = [
    { id: '2940d4a5-2712-4dac-8eed-ee7024ace677', email: 'admin.system@orbyx.internal', status: 'ACTIVE', role: 'super_admin' },
    { id: '1d4edf7b-b1b6-48ba-b36e-c52d916b4660', email: 'admin@orbyx.internal', status: 'ACTIVE' },
    { id: '6e568a2c-e0a7-479f-9a1a-d597404bd16c', email: 'anupriya@orbyx.internal', status: 'ACTIVE' },
    { id: 'c17aedab-7e34-4c24-97c9-dcbd0342b77a', email: 'archana@orbyx.internal', status: 'ACTIVE' },
    { id: 'b7855f06-4345-484b-a282-dc955bc04ff6', email: 'bhavadharani@orbyx.internal', status: 'ACTIVE' },
    { id: 'f9aecba5-61a3-4d16-ad95-3e40e73b1196', email: 'kannan@orbyx.internal', status: 'ACTIVE' },
    { id: '1d06eb46-4f00-4c04-baf6-940bf8486891', email: 'krishnaraj@orbyx.internal', status: 'ACTIVE' },
    { id: '06643574-2eab-4c9a-b0fb-23a0f0f58526', email: 'mahalakshmi@orbyx.internal', status: 'ACTIVE' },
    { id: 'a03e3cc7-e457-4e5e-b6fe-d6fefa46c565', email: 'praveen@orbyx.internal', status: 'ACTIVE' },
    { id: '278ceece-42da-45fc-8679-5ee22621f3ee', email: 'raseedh@orbyx.internal', status: 'ACTIVE', role: 'hr_admin', employeeId: 'EMP-HRM-0012' },
    { id: 'ea43d46b-fdee-4229-bc5a-ac18aa40b062', email: 'selvakumar@orbyx.internal', status: 'ACTIVE' }
  ];

  let baselineAllMatch = true;
  for (const b of baselineUsers) {
    const found = allUsers.find(u => u.id === b.id);
    if (!found) {
      console.error(`MISSING baseline user: ${b.email} (${b.id})`);
      baselineAllMatch = false;
    } else if (found.status !== b.status || found.email !== b.email) {
      console.error(`MODIFIED baseline user: ${b.email}`);
      baselineAllMatch = false;
    }
  }
  console.log('Original 11 users 100% matched and unmodified?:', baselineAllMatch);

  // 2. New Dedicated Bootstrap Administrator
  const newAdmin = allUsers.find(u => u.email === 'arunarchana2034@gmail.com');
  console.log('New Bootstrap Administrator account:', {
    id: newAdmin?.id,
    email: newAdmin?.email,
    username: newAdmin?.username,
    status: newAdmin?.status,
    roleCode: newAdmin?.roleCode,
    rolesInDb: newAdmin?.userRoles.map(ur => ur.role.code),
    invitationStatus: newAdmin?.invitationStatus,
    activationTokenExpiresAt: newAdmin?.activationTokenExpiresAt,
    hasTokenHashOnly: !!newAdmin?.activationTokenHash && !newAdmin?.activationTokenHash.includes(' ')
  });

  // 3. Sessions count
  const sessionsCount = await authPrisma.authSessions.count();
  console.log('Total sessions count in auth.auth_sessions:', sessionsCount);

  // 4. Employee count
  const emps = await employeePrisma.employee.findMany();
  console.log('Total employees in employee.employees:', emps.length);
  console.log('Raseedh A preserved?:', emps[0]?.email === 'raseedh@orbyx.internal');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

postVerification()
  .catch(console.error)
  .finally(async () => {
    await authPrisma.$disconnect();
    await employeePrisma.$disconnect();
  });

