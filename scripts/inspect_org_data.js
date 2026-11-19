const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=org' } } });

async function inspectOrg() {
  const profiles = await p.$queryRawUnsafe('SELECT * FROM org.company_profiles');
  console.log('Company Profiles in DB:', profiles);
  const branches = await p.$queryRawUnsafe('SELECT * FROM org.branches');
  console.log('Branches in DB:', branches.length);
  const depts = await p.$queryRawUnsafe('SELECT * FROM org.departments');
  console.log('Departments in DB:', depts.length);
  const desigs = await p.$queryRawUnsafe('SELECT * FROM org.designations');
  console.log('Designations in DB:', desigs.length);
  const statutory = await p.$queryRawUnsafe('SELECT * FROM org.statutory_compliance_configs');
  console.log('Statutory in DB:', statutory);
  await p.$disconnect();
}
inspectOrg();
