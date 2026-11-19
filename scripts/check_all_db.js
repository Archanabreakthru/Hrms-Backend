const { PrismaClient } = require('@prisma/client');
const schemas = ['auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification'];

async function testAll() {
  for (const s of schemas) {
    const p = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=${s}`
        }
      }
    });
    try {
      const tables = await p.$queryRawUnsafe(`SELECT table_name from information_schema.tables where table_schema = '${s}'`);
      console.log(`Schema [${s}]:`, tables.map(t => t.table_name).join(', '));
    } catch (e) {
      console.error(`Schema [${s}] Failed:`, e.message);
    } finally {
      await p.$disconnect();
    }
  }
}

testAll();
