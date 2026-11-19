const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=asset' } } });

async function checkAssetData() {
  const rows = await p.$queryRawUnsafe(`SELECT * FROM asset.assets`);
  console.log('Rows in asset.assets:', rows.length);
  if (rows.length > 0) {
    console.log('Sample asset:', rows[0]);
  }
  await p.$disconnect();
}
checkAssetData();
