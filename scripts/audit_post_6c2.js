const { PrismaClient: AuthPrismaClient } = require('../services/auth-service/src/generated/client');
const { PrismaClient: EmployeePrismaClient } = require('@prisma/client');
const { PrismaClient: AttendancePrismaClient } = require('../services/attendance-service/src/generated/client');

const authPrisma = new AuthPrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=auth' } } });
const employeePrisma = new EmployeePrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=employee' } } });
const attendancePrisma = new AttendancePrismaClient({ datasources: { db: { url: 'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=attendance' } } });

async function verify() {
  const users = await authPrisma.users.count();
  const perms = await authPrisma.permissions.count();
  const roles = await authPrisma.roles.count();
  const rps = await authPrisma.rolePermissions.count();
  const emps = await employeePrisma.employee.count();
  const leaves = await attendancePrisma.leaveApplication.count();
  const balances = await attendancePrisma.leaveBalance.count();
  const leaveTypes = await attendancePrisma.leaveType.count();
  const holidays = await attendancePrisma.holiday.count();

  console.log('PostgreSQL Counts:');
  console.log('  Auth Users:', users);
  console.log('  Permissions:', perms);
  console.log('  Roles:', roles);
  console.log('  RolePermissions:', rps);
  console.log('  Employees:', emps);
  console.log('  Leave Applications:', leaves);
  console.log('  Leave Balances:', balances);
  console.log('  Leave Types:', leaveTypes);
  console.log('  Holidays:', holidays);

  await authPrisma.$disconnect();
  await employeePrisma.$disconnect();
  await attendancePrisma.$disconnect();
}
verify().catch(console.error);

