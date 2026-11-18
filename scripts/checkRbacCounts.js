const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../services/auth-service/src/generated/client'));
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=auth' } }
});

async function main() {
  const count = await prisma.rolePermissions.count();
  console.log('Total role_permissions in PostgreSQL DB:', count);

  const roles = await prisma.roles.findMany({
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });

  for (const r of roles) {
    console.log(`${r.name} (${r.code}): ${r.permissions.length} permissions`);
  }

  const allRp = await prisma.rolePermissions.findMany({
    include: { permission: true, role: true }
  });
  const seen = new Set();
  const duplicates = [];
  for (const rp of allRp) {
    const key = `${rp.roleId}:${rp.permissionId}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  console.log('Duplicates count:', duplicates.length);

  // Compare each role in DB with canonical ROLE_PERMISSIONS_MAP
  const { ROLE_PERMISSIONS_MAP } = require('../shared/src/constants/roles');
  console.log('\n--- Discrepancy Breakdown by Role ---');
  for (const r of roles) {
    const dbCodes = r.permissions.map(p => p.permission.code).sort();
    const codeList = (ROLE_PERMISSIONS_MAP[r.code] || []).slice().sort();
    console.log(`\nRole: ${r.code}`);
    console.log(`DB Count: ${dbCodes.length} | Code Map Count: ${codeList.length}`);
    const inDbNotCode = dbCodes.filter(c => !codeList.includes(c));
    const inCodeNotDb = codeList.filter(c => !dbCodes.includes(c));
    if (inDbNotCode.length) console.log('  In DB but NOT in roles.ts:', inDbNotCode);
    if (inCodeNotDb.length) console.log('  In roles.ts but NOT in DB:', inCodeNotDb);
    if (!inDbNotCode.length && !inCodeNotDb.length) console.log('  Exact match!');
  }

  await prisma.$disconnect();
}
main().catch(console.error);
