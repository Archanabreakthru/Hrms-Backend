const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=notification' } } });

async function inspectNotification() {
  const tables = await p.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'notification'`);
  console.log('Tables in notification schema:', tables);
  for (const t of tables) {
    const cols = await p.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'notification' AND table_name = '${t.table_name}'`);
    console.log(`Table [${t.table_name}] columns:`, cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  }
  await p.$disconnect();
}
inspectNotification();
