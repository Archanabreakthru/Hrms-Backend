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
  const tables = await q(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `);
  const counts = [];
  for (const t of tables) {
    const full = `"${t.table_schema}"."${t.table_name}"`;
    try {
      const res = await q(`SELECT count(*)::int as c FROM ${full}`);
      counts.push({ schema: t.table_schema, table: t.table_name, count: res[0].c });
    } catch (e) {
      counts.push({ schema: t.table_schema, table: t.table_name, error: e.message });
    }
  }
  console.log(JSON.stringify(counts, null, 2));

  // Also query users in auth.users
  try {
    const userCols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users';`);
    console.log('\n--- AUTH USERS COLUMNS ---');
    console.log(userCols.map(c => c.column_name).join(', '));
    const users = await q(`SELECT * FROM auth.users LIMIT 15;`);
    console.log('\n--- AUTH USERS ROWS ---');
    console.log(users.map(u => ({ id: u.id, email: u.email, status: u.status, employee_id: u.employee_id, is_active: u.is_active })));
  } catch (e) {
    console.error('Error fetching users:', e.message);
  }

  // Also query user_roles
  try {
    const userRoles = await q(`
      SELECT ur.user_id, u.email, r.name, r.code 
      FROM auth.user_roles ur 
      JOIN auth.users u ON ur.user_id = u.id 
      JOIN auth.roles r ON ur.role_id = r.id;
    `);
    console.log('\n--- USER ROLES ---');
    console.log(JSON.stringify(userRoles, null, 2));
  } catch (e) {
    console.log('Error user_roles:', e.message);
  }

  // Also query employee records
  try {
    const empCols = await q(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'employee' AND table_name = 'employees';`);
    console.log('\n--- EMPLOYEES COLUMNS ---');
    console.log(empCols.map(c => c.column_name).join(', '));
    const emps = await q(`SELECT * FROM employee.employees LIMIT 15;`);
    console.log('\n--- EMPLOYEES ROWS ---');
    console.log(emps.map(e => ({ id: e.id, emp_id: e.emp_id || e.employee_number || e.code, name: `${e.first_name || ''} ${e.last_name || ''}`, email: e.email || e.work_email, status: e.status })));
  } catch (e) {
    console.log('Error querying employee.employees:', e.message);
  }
}

run().catch(console.error).finally(() => prisma['$disconnect']());
