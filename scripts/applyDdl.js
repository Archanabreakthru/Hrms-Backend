const fs = require('fs');
const path = require('path');

// Load environment variables from auth-service/.env
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
  // Strip block comments (/* ... */) and line comments (-- ...)
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.substring(0, idx) : line;
    })
    .join('\n');

  // Split on semicolons that are not inside quotes or dollar-quotes
  const statements = [];
  let current = '';
  let inString = false;
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    const nextChar = cleanSql[i + 1] || '';

    // Check single quote
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

    // Check dollar quote start/end ($$ or $tag$)
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

async function runMigration() {
  const executeQuery = prisma['$executeRawUnsafe'].bind(prisma);
  const selectQuery = prisma['$queryRawUnsafe'].bind(prisma);

  const sqlFiles = [
    '01_schema_setup.sql',
    '02_master_and_reference_tables.sql',
    '03_core_business_tables.sql',
    '04_foreign_keys_and_constraints.sql',
    '05_indexes.sql'
  ];

  console.log('--- Starting Database DDL Execution ---');

  for (const file of sqlFiles) {
    const filePath = path.join(__dirname, '../database/sql', file);
    console.log(`Processing ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sqlContent);
    console.log(` - Found ${statements.length} statements.`);

    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx];
      // Skip non-critical metadata comments if permission is restricted
      if (stmt.toUpperCase().startsWith('COMMENT ON SCHEMA')) {
        continue;
      }
      try {
        await executeQuery(stmt);
      } catch (err) {
        console.error(`✗ Error in ${file} at statement #${idx + 1}:\n${stmt.substring(0, 150)}...\nMessage: ${err.message}`);
        throw err;
      }
    }
    console.log(`✓ ${file} executed successfully.`);
  }

  // Verify created tables
  const tables = await selectQuery(`
    SELECT table_schema, count(*) as count 
    FROM information_schema.tables 
    WHERE table_schema IN ('auth', 'organization', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification')
    GROUP BY table_schema
    ORDER BY table_schema;
  `);

  console.log('\n--- DDL Verification Summary (Table Counts by Schema) ---');
  console.log(JSON.stringify(tables, null, 2));
}

runMigration()
  .then(() => {
    console.log('\n✓ Database Schema Initialization Complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n✗ Database Schema Initialization Failed.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma['$disconnect']();
  });
