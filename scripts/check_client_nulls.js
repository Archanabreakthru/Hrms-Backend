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

const { PrismaClient } = require(path.join(__dirname, '../services/client-service/src/generated/client'));
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'client' 
    ORDER BY table_name, ordinal_position;
  `);
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);

