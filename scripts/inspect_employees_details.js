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

async function run() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const emps = await q(`SELECT * FROM employee.employees ORDER BY id;`);
  console.log('--- ALL 9 POSTGRESQL EMPLOYEES ---');
  console.log(JSON.stringify(emps, null, 2));

  const orgProfiles = await q(`SELECT * FROM org.company_profiles;`);
  console.log('--- ORG PROFILES ---', orgProfiles);

  const branches = await q(`SELECT * FROM org.branches;`);
  console.log('--- ORG BRANCHES ---', branches);

  const departments = await q(`SELECT * FROM org.departments;`);
  console.log('--- ORG DEPARTMENTS ---', departments);

  const designations = await q(`SELECT * FROM org.designations;`);
  console.log('--- ORG DESIGNATIONS ---', designations);
}

run().catch(console.error).finally(() => prisma['$disconnect']());

