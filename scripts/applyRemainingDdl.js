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

function splitStatements(sql) {
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.substring(0, idx) : line;
    })
    .join('\n');

  const statements = [];
  let current = '';
  let inString = false;
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    const nextChar = cleanSql[i + 1] || '';

    if (char === "'" && !inDollarQuote) {
      if (inString && nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += char;
      continue;
    }

    if (char === '$' && !inString) {
      const rest = cleanSql.substring(i);
      const match = rest.match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match[0];
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        } else if (match[0] === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
          current += match[0];
          i += match[0].length - 1;
          continue;
        }
      }
    }

    if (char === ';' && !inString && !inDollarQuote) {
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function runRemainingDdl() {
  const executeQuery = prisma['$executeRawUnsafe'].bind(prisma);
  const selectQuery = prisma['$queryRawUnsafe'].bind(prisma);

  const files = ['04_foreign_keys_and_constraints.sql', '05_indexes.sql'];

  for (const file of files) {
    const filePath = path.join(__dirname, '../database/sql', file);
    console.log(`Processing ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sqlContent);

    let skipped = 0;
    let applied = 0;

    for (const stmt of statements) {
      try {
        await executeQuery(stmt);
        applied++;
      } catch (err) {
        // If constraint or index already exists, safely skip it
        if (err.message.includes('already exists')) {
          skipped++;
        } else {
          console.error(`✗ Error in statement:\n${stmt.substring(0, 150)}...\n${err.message}`);
          throw err;
        }
      }
    }
    console.log(`✓ ${file}: ${applied} applied, ${skipped} already existed.`);
  }

  // Count total tables, foreign keys, and indexes
  const fkCount = await selectQuery(`
    SELECT count(*)::int as count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification');
  `);

  const idxCount = await selectQuery(`
    SELECT count(*)::int as count 
    FROM pg_indexes 
    WHERE schemaname IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification');
  `);

  console.log(`\n✓ Total Foreign Keys Active: ${fkCount[0].count}`);
  console.log(`✓ Total Indexes Active: ${idxCount[0].count}`);
}

runRemainingDdl()
  .then(() => {
    console.log('\n✓ Database Schema, Foreign Keys & Indexes Complete!');
    process.exit(0);
  })
  .catch(() => process.exit(1))
  .finally(async () => {
    await prisma['$disconnect']();
  });

