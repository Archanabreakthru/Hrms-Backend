export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MANAGING_DIRECTOR = 'managing_director',
  HR_ADMIN = 'hr_admin',
  SENIOR_MANAGER = 'senior_manager',
  REPORTING_MANAGER = 'reporting_manager',
  EMPLOYEE = 'employee',
  CLIENT_SUPERVISOR = 'client_supervisor',
}

export enum AccessScope {
  SELF = 'self',
  DIRECT_REPORT = 'direct_report',
  DEPARTMENT = 'department',
  CLIENT_TENANT = 'client_tenant',
  ORGANIZATION_ALL = 'organization_all',
}

export type Permission =
  // System & Organization
  | 'system.config.read'
  | 'system.config.write'
  | 'org.profile.read'
  | 'org.profile.manage'
  | 'org.branches.manage'
  | 'org.departments.manage'
  | 'org.designations.manage'
  | 'org.governance.manage'
  | 'org.policies.manage'
  // Identity & Auth
  | 'auth.users.manage'
  | 'auth.sessions.revoke'
  // Employee Directory & Profiles
  | 'employee.directory.read_basic'
  | 'employee.profile.read_self'
  | 'employee.profile.update_self'
  | 'employee.profile.read_team'
  | 'employee.profile.read_org'
  | 'employee.profile.read_all'
  | 'employee.profile.edit_personal'
  | 'employee.profile.edit_employment'
  | 'employee.profile.edit_reporting'
  | 'employee.salary.read'
  | 'employee.salary.edit'
  | 'employee.bank_details.read'
  | 'employee.bank_details.edit'
  | 'employee.identity_documents.read'
  | 'employee.service_records.manage'
  | 'employee.service_records.approve'
  // Attendance & Shifts
  | 'attendance.punch_self'
  | 'attendance.read_team'
  | 'attendance.read_all'
  | 'attendance.regularize_self'
  | 'attendance.approve_team'
  | 'attendance.approve_all'
  | 'shifts.roster.manage'
  // Leaves
  | 'leave.apply_self'
  | 'leave.read_team'
  | 'leave.read_all'
  | 'leave.approve_team'
  | 'leave.approve_all'
  | 'leave.policies.manage'
  // Client Management & Verification
  | 'client.portal.login'
  | 'client.organizations.manage'
  | 'client.supervisors.manage'
  | 'client.deployments.manage'
  | 'client.deployments.read_assigned'
  | 'client.attendance.verify_deployed'
  | 'client.verification.hr_resolve'
  | 'client.dispute.raise'
  // Payroll & Compensation
  | 'payroll.structures.manage'
  | 'payroll.process'
  | 'payroll.run.execute'
  | 'payslips.read_self'
  | 'payslips.read_all'
  // Expenses
  | 'expenses.claim_self'
  | 'expenses.read_team'
  | 'expenses.read_all'
  | 'expenses.approve_team'
  | 'expenses.approve_all'
  // Assets
  | 'assets.read_self'
  | 'assets.read_team'
  | 'assets.read_all'
  | 'assets.administer'
  | 'assets.acknowledge_self'
  // Documents
  | 'documents.upload_self'
  | 'documents.read_team'
  | 'documents.read_all'
  | 'documents.verify'
  // Notifications & Audit
  | 'notifications.read_self'
  | 'notifications.broadcast'
  | 'audit.logs.read_all'
  // Reports
  | 'reports.organization.read'
  | 'reports.executive.read'
  | 'reports.payroll.view_aggregate';

export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'system.config.read',
    'system.config.write',
    'auth.users.manage',
    'auth.sessions.revoke',
    'org.profile.read',
    'org.profile.manage',
    'org.branches.manage',
    'org.departments.manage',
    'org.designations.manage',
    'org.policies.manage',
    'employee.directory.read_basic',
    'employee.profile.read_org',
    'employee.profile.read_all',
    'audit.logs.read_all',
    'reports.organization.read',
    'reports.executive.read',
  ],
  [UserRole.MANAGING_DIRECTOR]: [
    'org.profile.read',
    'org.governance.manage',
    'employee.directory.read_basic',
    'employee.profile.read_org',
    'employee.profile.read_all',
    'employee.salary.read',
    'reports.organization.read',
    'reports.executive.read',
    'reports.payroll.view_aggregate',
    'audit.logs.read_all',
  ],
  [UserRole.HR_ADMIN]: [
    'org.profile.read',
    'org.branches.manage',
    'org.departments.manage',
    'org.designations.manage',
    'org.policies.manage',
    'employee.directory.read_basic',
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.profile.read_team',
    'employee.profile.read_org',
    'employee.profile.read_all',
    'employee.profile.edit_personal',
    'employee.profile.edit_employment',
    'employee.profile.edit_reporting',
    'employee.salary.read',
    'employee.salary.edit',
    'employee.bank_details.read',
    'employee.bank_details.edit',
    'employee.identity_documents.read',
    'employee.service_records.manage',
    'employee.service_records.approve',
    'attendance.read_team',
    'attendance.read_all',
    'attendance.approve_all',
    'shifts.roster.manage',
    'leave.read_team',
    'leave.read_all',
    'leave.approve_all',
    'leave.policies.manage',
    'client.organizations.manage',
    'client.supervisors.manage',
    'client.deployments.manage',
    'client.verification.hr_resolve',
    'payroll.structures.manage',
    'payroll.process',
    'payroll.run.execute',
    'payslips.read_all',
    'expenses.read_all',
    'expenses.approve_all',
    'assets.read_all',
    'assets.administer',
    'documents.read_all',
    'documents.verify',
    'audit.logs.read_all',
    'reports.organization.read',
  ],
  [UserRole.SENIOR_MANAGER]: [
    'employee.directory.read_basic',
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.profile.read_team',
    'employee.profile.read_org',
    'employee.profile.edit_reporting',
    'attendance.punch_self',
    'attendance.read_team',
    'attendance.approve_team',
    'leave.apply_self',
    'leave.read_team',
    'leave.approve_team',
    'expenses.claim_self',
    'expenses.read_team',
    'expenses.approve_team',
    'assets.read_self',
    'assets.read_team',
    'assets.acknowledge_self',
    'documents.upload_self',
    'documents.read_team',
    'payslips.read_self',
    'reports.organization.read',
  ],
  [UserRole.REPORTING_MANAGER]: [
    'employee.directory.read_basic',
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.profile.read_team',
    'attendance.punch_self',
    'attendance.read_team',
    'attendance.approve_team',
    'leave.apply_self',
    'leave.read_team',
    'leave.approve_team',
    'expenses.claim_self',
    'expenses.read_team',
    'expenses.approve_team',
    'assets.read_self',
    'assets.read_team',
    'assets.acknowledge_self',
    'documents.upload_self',
    'documents.read_team',
    'payslips.read_self',
  ],
  [UserRole.EMPLOYEE]: [
    'employee.directory.read_basic',
    'employee.profile.read_self',
    'employee.profile.update_self',
    'employee.profile.edit_personal',
    'attendance.punch_self',
    'attendance.regularize_self',
    'leave.apply_self',
    'expenses.claim_self',
    'assets.read_self',
    'assets.acknowledge_self',
    'documents.upload_self',
    'payslips.read_self',
    'notifications.read_self',
  ],
  [UserRole.CLIENT_SUPERVISOR]: [
    'client.portal.login',
    'client.deployments.read_assigned',
    'client.attendance.verify_deployed',
    'client.dispute.raise',
  ],
};

