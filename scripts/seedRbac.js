const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
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

// High-security PBKDF2 hash (100,000 iterations HMAC-SHA512)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const ROLES = [
  { code: 'super_admin', name: 'Super Administrator', description: 'Platform initialization, security policies and low-level system configuration' },
  { code: 'managing_director', name: 'Managing Director', description: 'Executive oversight, board governance, aggregate financials and corporate steering' },
  { code: 'hr_admin', name: 'HR Administrator', description: 'People operations, employee records, payroll, policies, assets, and operational approvals' },
  { code: 'senior_manager', name: 'Senior Manager', description: 'Senior operational delivery management, org structure and department approvals' },
  { code: 'reporting_manager', name: 'Reporting Manager', description: 'Team lead, shift tracking, leave approvals and project delivery coordination' },
  { code: 'employee', name: 'Employee', description: 'Workforce member self-service: attendance, leaves, expense claims and payslips' },
  { code: 'client_supervisor', name: 'Client Supervisor', description: 'External client delivery partner for timesheet verification and project attendance' }
];

const PERMISSIONS = [
  // System & Organization
  { code: 'system.config.read', name: 'Read System Configuration', module: 'System' },
  { code: 'system.config.write', name: 'Write System Configuration', module: 'System' },
  { code: 'org.profile.read', name: 'Read Organization Profile', module: 'Organization' },
  { code: 'org.profile.manage', name: 'Manage Organization Profile', module: 'Organization' },
  { code: 'org.branches.manage', name: 'Manage Branches', module: 'Organization' },
  { code: 'org.departments.manage', name: 'Manage Departments', module: 'Organization' },
  { code: 'org.designations.manage', name: 'Manage Designations', module: 'Organization' },
  { code: 'org.governance.manage', name: 'Manage Corporate Governance', module: 'Organization' },
  { code: 'org.policies.manage', name: 'Manage HR Policies', module: 'Organization' },
  
  // Identity & Auth
  { code: 'auth.users.manage', name: 'Manage User Accounts', module: 'Auth' },
  { code: 'auth.sessions.revoke', name: 'Revoke User Sessions', module: 'Auth' },
  
  // Employee Directory & Profiles
  { code: 'employee.directory.read_basic', name: 'Read Basic Directory', module: 'Employee' },
  { code: 'employee.profile.read_self', name: 'Read Self Profile', module: 'Employee' },
  { code: 'employee.profile.update_self', name: 'Update Self Profile', module: 'Employee' },
  { code: 'employee.profile.read_team', name: 'Read Team Profiles', module: 'Employee' },
  { code: 'employee.profile.read_org', name: 'Read Organization Profiles', module: 'Employee' },
  { code: 'employee.profile.read_all', name: 'Read All Employee Details', module: 'Employee' },
  { code: 'employee.profile.edit_personal', name: 'Edit Personal Details', module: 'Employee' },
  { code: 'employee.profile.edit_employment', name: 'Edit Employment Details', module: 'Employee' },
  { code: 'employee.profile.edit_reporting', name: 'Edit Reporting Hierarchy', module: 'Employee' },
  { code: 'employee.salary.read', name: 'Read Confidential Salary', module: 'Employee' },
  { code: 'employee.salary.edit', name: 'Edit Salary Structure', module: 'Employee' },
  { code: 'employee.bank_details.read', name: 'Read Bank Details', module: 'Employee' },
  { code: 'employee.bank_details.edit', name: 'Edit Bank Details', module: 'Employee' },
  { code: 'employee.identity_documents.read', name: 'Read Identity Documents', module: 'Employee' },
  { code: 'employee.service_records.manage', name: 'Manage Service Records', module: 'Employee' },
  { code: 'employee.service_records.approve', name: 'Approve Service Records', module: 'Employee' },
  
  // Attendance & Shifts
  { code: 'attendance.punch_self', name: 'Record Self Punch', module: 'Attendance' },
  { code: 'attendance.read_team', name: 'Read Team Attendance', module: 'Attendance' },
  { code: 'attendance.read_all', name: 'Read All Attendance', module: 'Attendance' },
  { code: 'attendance.regularize_self', name: 'Request Self Regularization', module: 'Attendance' },
  { code: 'attendance.approve_team', name: 'Approve Team Attendance', module: 'Attendance' },
  { code: 'attendance.approve_all', name: 'Override All Attendance', module: 'Attendance' },
  { code: 'shifts.roster.manage', name: 'Manage Shift Rosters', module: 'Attendance' },
  
  // Leaves
  { code: 'leave.apply_self', name: 'Apply Self Leave', module: 'Leave' },
  { code: 'leave.read_team', name: 'Read Team Leaves', module: 'Leave' },
  { code: 'leave.read_all', name: 'Read All Leaves', module: 'Leave' },
  { code: 'leave.approve_team', name: 'Approve Team Leaves', module: 'Leave' },
  { code: 'leave.approve_all', name: 'Override All Leaves', module: 'Leave' },
  { code: 'leave.policies.manage', name: 'Manage Leave Policies', module: 'Leave' },
  
  // Client Management & Verification
  { code: 'client.portal.login', name: 'Login to Client Portal', module: 'Client' },
  { code: 'client.organizations.manage', name: 'Manage Client Organizations', module: 'Client' },
  { code: 'client.supervisors.manage', name: 'Manage Client Supervisors', module: 'Client' },
  { code: 'client.deployments.manage', name: 'Manage Deployments', module: 'Client' },
  { code: 'client.deployments.read_assigned', name: 'Read Assigned Deployments', module: 'Client' },
  { code: 'client.attendance.verify_deployed', name: 'Verify Deployed Attendance', module: 'Client' },
  { code: 'client.verification.hr_resolve', name: 'Resolve Timesheet Disputes', module: 'Client' },
  { code: 'client.dispute.raise', name: 'Raise Attendance Dispute', module: 'Client' },
  
  // Payroll & Compensation
  { code: 'payroll.structures.manage', name: 'Manage Payroll Structures', module: 'Payroll' },
  { code: 'payroll.process', name: 'Process Payroll', module: 'Payroll' },
  { code: 'payroll.run.execute', name: 'Execute Payroll Run', module: 'Payroll' },
  { code: 'payslips.read_self', name: 'Read Self Payslip', module: 'Payroll' },
  { code: 'payslips.read_all', name: 'Read All Payslips', module: 'Payroll' },
  
  // Expenses
  { code: 'expenses.claim_self', name: 'Claim Self Expense', module: 'Expense' },
  { code: 'expenses.read_team', name: 'Read Team Expenses', module: 'Expense' },
  { code: 'expenses.read_all', name: 'Read All Expenses', module: 'Expense' },
  { code: 'expenses.approve_team', name: 'Approve Team Expenses', module: 'Expense' },
  { code: 'expenses.approve_all', name: 'Approve All Expenses for Payout', module: 'Expense' },
  
  // Assets
  { code: 'assets.read_self', name: 'Read Self Allocated Assets', module: 'Asset' },
  { code: 'assets.read_team', name: 'Read Team Assets', module: 'Asset' },
  { code: 'assets.read_all', name: 'Read Company Asset Inventory', module: 'Asset' },
  { code: 'assets.administer', name: 'Administer Assets & Allocations', module: 'Asset' },
  { code: 'assets.acknowledge_self', name: 'Acknowledge Received Asset', module: 'Asset' },
  
  // Documents
  { code: 'documents.upload_self', name: 'Upload Personal Documents', module: 'Document' },
  { code: 'documents.read_team', name: 'Read Team Documents', module: 'Document' },
  { code: 'documents.read_all', name: 'Read All Documents', module: 'Document' },
  { code: 'documents.verify', name: 'Verify KYC Documents', module: 'Document' },
  
  // Notifications & Audit
  { code: 'notifications.read_self', name: 'Read Self Notifications', module: 'Notification' },
  { code: 'notifications.broadcast', name: 'Dispatch Announcements', module: 'Notification' },
  { code: 'audit.logs.read_all', name: 'Read System Audit Logs', module: 'Audit' },
  
  // Reports
  { code: 'reports.organization.read', name: 'Read Organization Analytics', module: 'Report' },
  { code: 'reports.executive.read', name: 'Read Executive Dashboards', module: 'Report' },
  { code: 'reports.payroll.view_aggregate', name: 'View Aggregate Payroll Burn', module: 'Report' }
];

const ROLE_PERMISSIONS_MAPPING = {
  super_admin: [
    'system.config.read', 'system.config.write', 'auth.users.manage', 'auth.sessions.revoke',
    'org.profile.read', 'org.profile.manage', 'org.branches.manage', 'org.departments.manage',
    'org.designations.manage', 'org.policies.manage', 'employee.directory.read_basic',
    'employee.profile.read_org', 'employee.profile.read_all', 'audit.logs.read_all',
    'reports.organization.read', 'reports.executive.read', 'notifications.broadcast'
  ],
  managing_director: [
    'org.profile.read', 'org.governance.manage', 'employee.directory.read_basic',
    'employee.profile.read_org', 'employee.profile.read_all', 'employee.salary.read',
    'reports.organization.read', 'reports.executive.read', 'reports.payroll.view_aggregate',
    'audit.logs.read_all'
  ],
  hr_admin: [
    'org.profile.read', 'org.branches.manage', 'org.departments.manage', 'org.designations.manage',
    'org.policies.manage', 'employee.directory.read_basic', 'employee.profile.read_self',
    'employee.profile.update_self', 'employee.profile.read_team', 'employee.profile.read_org',
    'employee.profile.read_all', 'employee.profile.edit_personal', 'employee.profile.edit_employment',
    'employee.profile.edit_reporting', 'employee.salary.read', 'employee.salary.edit',
    'employee.bank_details.read', 'employee.bank_details.edit', 'employee.identity_documents.read',
    'employee.service_records.manage', 'employee.service_records.approve', 'attendance.read_team',
    'attendance.read_all', 'attendance.approve_all', 'shifts.roster.manage', 'leave.read_team',
    'leave.read_all', 'leave.approve_all', 'leave.policies.manage', 'client.organizations.manage',
    'client.supervisors.manage', 'client.deployments.manage', 'client.verification.hr_resolve',
    'payroll.structures.manage', 'payroll.process', 'payroll.run.execute', 'payslips.read_all',
    'expenses.read_all', 'expenses.approve_all', 'assets.read_all', 'assets.administer',
    'documents.read_all', 'documents.verify', 'audit.logs.read_all', 'reports.organization.read',
    'notifications.broadcast'
  ],
  senior_manager: [
    'employee.directory.read_basic', 'employee.profile.read_self', 'employee.profile.update_self',
    'employee.profile.read_team', 'employee.profile.read_org', 'employee.profile.edit_reporting',
    'attendance.punch_self', 'attendance.read_team', 'attendance.approve_team', 'leave.apply_self',
    'leave.read_team', 'leave.approve_team', 'expenses.claim_self', 'expenses.read_team',
    'expenses.approve_team', 'assets.read_self', 'assets.read_team', 'assets.acknowledge_self',
    'documents.upload_self', 'documents.read_team', 'payslips.read_self', 'reports.organization.read'
  ],
  reporting_manager: [
    'employee.directory.read_basic', 'employee.profile.read_self', 'employee.profile.update_self',
    'employee.profile.read_team', 'attendance.punch_self', 'attendance.read_team',
    'attendance.approve_team', 'leave.apply_self', 'leave.read_team', 'leave.approve_team',
    'expenses.claim_self', 'expenses.read_team', 'expenses.approve_team', 'assets.read_self',
    'assets.read_team', 'assets.acknowledge_self', 'documents.upload_self', 'documents.read_team',
    'payslips.read_self'
  ],
  employee: [
    'employee.directory.read_basic', 'employee.profile.read_self', 'employee.profile.update_self',
    'employee.profile.edit_personal', 'attendance.punch_self', 'attendance.regularize_self',
    'leave.apply_self', 'expenses.claim_self', 'assets.read_self', 'assets.acknowledge_self',
    'documents.upload_self', 'payslips.read_self', 'notifications.read_self'
  ],
  client_supervisor: [
    'client.portal.login', 'client.deployments.read_assigned', 'client.attendance.verify_deployed',
    'client.dispute.raise'
  ]
};

// Canonical employee baseline for seeding employee records to satisfy foreign key constraints
const EMPLOYEES = [
  { id: 'EMP-MD-0001', firstName: 'Dr. A.', lastName: 'Selvakumar', officialEmail: 'selvakumar@orbyx.internal', phone: '+91 98400 11000' },
  { id: 'EMP-STF-0002', firstName: 'S.', lastName: 'Kannan', officialEmail: 'kannan@orbyx.internal', phone: '+91 98400 11001' },
  { id: 'EMP-SDM-0003', firstName: 'Krishnaraj', lastName: 'V', officialEmail: 'krishnaraj@orbyx.internal', phone: '+91 98400 11002' },
  { id: 'EMP-HRM-0012', firstName: 'Raseedh', lastName: 'A', officialEmail: 'raseedh@orbyx.internal', phone: '+91 98400 11003' },
  { id: 'EMP-DEVOPS-0014', firstName: 'Bhavadharani', lastName: 'S', officialEmail: 'bhavadharani@orbyx.internal', phone: '+91 98400 11004' },
  { id: 'EMP-SWE-0004', firstName: 'Archana', lastName: 'K', officialEmail: 'archana@orbyx.internal', phone: '+91 98400 11005' },
  { id: 'EMP-SWE-0007', firstName: 'Maha Lakshmi', lastName: 'R', officialEmail: 'mahalakshmi@orbyx.internal', phone: '+91 98400 11006' },
  { id: 'EMP-SWE-0005', firstName: 'AnuPriya', lastName: 'M', officialEmail: 'anupriya@orbyx.internal', phone: '+91 98400 11007' },
  { id: 'EMP-SWE-0010', firstName: 'Praveen', lastName: 'Kumar', officialEmail: 'praveen@orbyx.internal', phone: '+91 98400 11008' }
];

const INITIAL_USERS = [
  {
    email: 'admin.system@orbyx.internal',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'OrbyxSuperAdmin@2026',
    role: 'super_admin',
    employeeId: null,
    status: 'ACTIVE'
  },
  {
    email: 'selvakumar@orbyx.internal',
    password: 'Selva@2026PasswordSetup',
    role: 'managing_director',
    employeeId: 'EMP-MD-0001',
    status: 'ACTIVE'
  },
  {
    email: 'kannan@orbyx.internal',
    password: 'Kannan@2026PasswordSetup',
    role: 'senior_manager',
    employeeId: 'EMP-STF-0002',
    status: 'ACTIVE'
  },
  {
    email: 'krishnaraj@orbyx.internal',
    password: 'Krishna@2026PasswordSetup',
    role: 'reporting_manager',
    employeeId: 'EMP-SDM-0003',
    status: 'ACTIVE'
  },
  {
    email: 'raseedh@orbyx.internal',
    password: 'Raseedh@2026PasswordSetup',
    role: 'hr_admin',
    employeeId: 'EMP-HRM-0012',
    status: 'ACTIVE'
  },
  {
    email: 'bhavadharani@orbyx.internal',
    password: 'Bhava@2026PasswordSetup',
    role: 'employee',
    employeeId: 'EMP-DEVOPS-0014',
    status: 'ACTIVE'
  },
  {
    email: 'archana@orbyx.internal',
    password: 'Archana@2026PasswordSetup',
    role: 'employee',
    employeeId: 'EMP-SWE-0004',
    status: 'ACTIVE'
  },
  {
    email: 'mahalakshmi@orbyx.internal',
    password: 'Maha@2026PasswordSetup',
    role: 'employee',
    employeeId: 'EMP-SWE-0007',
    status: 'ACTIVE'
  },
  {
    email: 'anupriya@orbyx.internal',
    password: 'Anu@2026PasswordSetup',
    role: 'employee',
    employeeId: 'EMP-SWE-0005',
    status: 'ACTIVE'
  },
  {
    email: 'praveen@orbyx.internal',
    password: 'Praveen@2026PasswordSetup',
    role: 'employee',
    employeeId: 'EMP-SWE-0010',
    status: 'ACTIVE'
  }
];

async function seedRbac() {
  const executeQuery = prisma['$executeRawUnsafe'].bind(prisma);

  console.log('--- Starting PostgreSQL Database Seeding ---');

  // 1. Seed Roles
  console.log('Seeding Roles...');
  const roleMap = {};
  for (const r of ROLES) {
    const existing = await prisma.roles.findUnique({ where: { code: r.code } });
    if (!existing) {
      const created = await prisma.roles.create({
        data: {
          code: r.code,
          name: r.name,
          description: r.description,
          isSystemRole: true
        }
      });
      roleMap[r.code] = created.id;
    } else {
      roleMap[r.code] = existing.id;
    }
  }
  console.log(`✓ 7 Roles verified.`);

  // 2. Seed Permissions
  console.log('Seeding Permissions...');
  const permMap = {};
  for (const p of PERMISSIONS) {
    const existing = await prisma.permissions.findUnique({ where: { code: p.code } });
    if (!existing) {
      const created = await prisma.permissions.create({
        data: {
          code: p.code,
          name: p.name,
          module: p.module,
          description: p.name
        }
      });
      permMap[p.code] = created.id;
    } else {
      permMap[p.code] = existing.id;
    }
  }
  console.log(`✓ 73 Permissions verified.`);

  // 3. Seed Role-Permissions
  console.log('Seeding Role-Permission Mappings...');
  let mappingsCreated = 0;
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
    const roleId = roleMap[roleCode];
    if (!roleId) continue;

    for (const pCode of permCodes) {
      const permId = permMap[pCode];
      if (!permId) continue;

      const existing = await prisma.rolePermissions.findUnique({
        where: {
          roleId_permissionId: { roleId, permissionId: permId }
        }
      });

      if (!existing) {
        await prisma.rolePermissions.create({
          data: { roleId, permissionId: permId }
        });
        mappingsCreated++;
      }
    }
  }
  const totalMappingsInDb = await prisma.rolePermissions.count();
  console.log(`✓ Role-Permission Mappings verified. Active in DB: ${totalMappingsInDb}`);

  // 4. Seed Canonical Employees in employee.employees so auth.users foreign key is satisfied
  console.log('Seeding Baseline Employees in employee.employees...');
  for (const emp of EMPLOYEES) {
    await executeQuery(`
      INSERT INTO employee.employees (
        id, first_name, last_name, official_email, phone, 
        employment_status, profile_status, employment_type, date_of_joining, notice_period_days
      )
      VALUES (
        '${emp.id}', '${emp.firstName}', '${emp.lastName}', '${emp.officialEmail}', '${emp.phone}', 
        'Active', 'Active', 'Permanent', '2023-01-01', 30
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  }
  console.log(`✓ 9 Baseline Employees verified in employee.employees.`);

  // 5. Seed Users and User-Roles
  console.log('Seeding Users & Primary User-Roles...');
  let usersCreated = 0;
  for (const u of INITIAL_USERS) {
    const existing = await prisma.users.findUnique({ where: { email: u.email } });
    let userId;

    if (!existing) {
      const passHash = hashPassword(u.password);
      const created = await prisma.users.create({
        data: {
          email: u.email,
          passwordHash: passHash,
          roleCode: u.role,
          status: u.status,
          employeeId: u.employeeId
        }
      });
      userId = created.id;
      usersCreated++;
      console.log(`  + Created user: ${u.email} (${u.role})`);
    } else {
      userId = existing.id;
      console.log(`  . User already exists: ${u.email}`);
    }

    // Assign to auth.user_roles
    const roleId = roleMap[u.role];
    if (roleId) {
      const existingUserRole = await prisma.userRoles.findUnique({
        where: { userId_roleId: { userId, roleId } }
      });
      if (!existingUserRole) {
        await prisma.userRoles.create({
          data: { userId, roleId }
        });
      }
    }
  }

  const activeUsersCount = await prisma.users.count();
  const activeUserRolesCount = await prisma.userRoles.count();
  console.log(`✓ Users & Role assignments verified. Total active users in DB: ${activeUsersCount}, User-Role links: ${activeUserRolesCount}`);

  console.log('\n======================================================');
  console.log('✓ POSTGRESQL RBAC & USER SEEDING COMPLETED SUCCESSFULLY');
  console.log('======================================================');
}

seedRbac()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('✗ Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma['$disconnect']();
  });
