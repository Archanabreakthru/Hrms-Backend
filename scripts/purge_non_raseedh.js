const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../services/attendance-service/.env'), 'utf8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] ? match[2].trim() : '';
    val = val.replace(/^["']|["']$/g, '');
    process.env[match[1]] = val;
  }
});

const { PrismaClient } = require(path.join(__dirname, '../services/attendance-service/src/generated/client'));
const prisma = new PrismaClient();

async function purgeNonRaseedhEmployees() {
  const q = prisma['$queryRawUnsafe'].bind(prisma);
  const exec = prisma['$executeRawUnsafe'].bind(prisma);

  console.log('--- PURGING TEST EMPLOYEES EXCLUDING RASEEDH ---');

  // Verify Raseedh's record
  const raseedh = await q(`SELECT id, first_name, last_name, official_email FROM employee.employees WHERE official_email = 'raseedh@orbyx.internal';`);
  console.log('Preserving Raseedh:', raseedh);

  // 1. Clear child records for employees OTHER than Raseedh
  await exec(`UPDATE employee.employees SET reporting_manager_id = NULL WHERE official_email != 'raseedh@orbyx.internal';`);
  await exec(`DELETE FROM employee.employee_bank_details WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM employee.employee_statutory_details WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM employee.employee_documents WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM employee.service_records WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM employee.insurance_policies WHERE employee_id != 'EMP-HRM-0012';`);

  // 2. Clear attendance and client child records for employees other than Raseedh
  await exec(`DELETE FROM attendance.attendance_records WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM attendance.shift_schedules WHERE employee_id != 'EMP-HRM-0012';`);
  await exec(`DELETE FROM attendance.attendance_regularizations WHERE employee_id != 'EMP-HRM-0012';`);

  // 3. Delete non-Raseedh employee records from employee.employees
  const delRes = await exec(`DELETE FROM employee.employees WHERE official_email != 'raseedh@orbyx.internal';`);
  console.log(`✓ Deleted non-Raseedh employee records.`);

  // 4. Verify remaining employees in employee.employees
  const remainingEmps = await q(`SELECT id, first_name, last_name, official_email FROM employee.employees;`);
  console.log('Remaining employee in DB (Raseedh only):', remainingEmps);

  // 5. Verify auth users remain intact
  const users = await q(`SELECT count(*)::int as count FROM auth.users;`);
  const roles = await q(`SELECT count(*)::int as count FROM auth.roles;`);
  console.log(`✓ auth.users count: ${users[0].count}, auth.roles count: ${roles[0].count}`);

  await prisma['$disconnect']();
}

purgeNonRaseedhEmployees().catch(console.error);

