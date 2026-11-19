const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../services/auth-service/.env') });
const { PrismaClient } = require('../services/auth-service/src/generated/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function check() {
  const users = await prisma.users.findMany({
    select: { id: true, email: true, username: true, roleCode: true, isActive: true, status: true, passwordHash: true }
  });
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Username: ${u.username}, RoleCode: ${u.roleCode}, PasswordHash: ${u.passwordHash?.substring(0, 20)}...`);
  }
  await prisma.$disconnect();
}
check().catch(e => {
  console.error(e);
  process.exit(1);
});
