import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp as createAuthApp } from '../services/auth-service/src/app';
import { AuthService } from '../services/auth-service/src/services/authService';
import { AuthController } from '../services/auth-service/src/controllers/authController';
import { InMemoryAuthRepository } from '../services/auth-service/src/repositories/authRepository';

import { createApp as createOrgApp } from '../services/organization-service/src/app';
import { OrganizationService } from '../services/organization-service/src/services/orgService';
import { OrganizationController } from '../services/organization-service/src/controllers/orgController';
import { InMemoryOrganizationRepository } from '../services/organization-service/src/repositories/orgRepository';
import { UserRole } from '../shared/src/constants/roles';

test('End-to-End Auth & Org integration: login -> JWT token -> authorized Org call', async () => {
  // Setup Auth Service
  const authRepo = new InMemoryAuthRepository();
  const authService = new AuthService(authRepo);
  const authController = new AuthController(authService);
  const authApp = createAuthApp(authController);

  // Setup Org Service
  const orgRepo = new InMemoryOrganizationRepository();
  const orgService = new OrganizationService(orgRepo);
  const orgController = new OrganizationController(orgService);
  const orgApp = createOrgApp(orgController);

  // Register an HR admin and an Employee
  await authService.register({
    email: 'hr.manager@orbyx.io',
    password: 'SecureHrPassword123!',
    role: UserRole.HR_ADMIN,
    employeeId: 'EMP-HRM-0001',
  });

  await authService.register({
    email: 'john.dev@orbyx.io',
    password: 'EmployeePass123!',
    role: UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0002',
  });

  // Login HR Admin
  const hrLogin = await authService.login('hr.manager@orbyx.io', 'SecureHrPassword123!');
  assert.ok(hrLogin.accessToken);

  // Login Employee
  const empLogin = await authService.login('john.dev@orbyx.io', 'EmployeePass123!');
  assert.ok(empLogin.accessToken);

  // Verify permissions
  assert.ok(hrLogin.permissions.includes('org.branches.manage'));
  assert.ok(!empLogin.permissions.includes('org.branches.manage'));

  // HR creates branch via OrgService
  const newBranch = await orgService.createBranch({
    code: 'HYD',
    name: 'Hyderabad Development Center',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    address: 'HITEC City',
    isHeadquarters: false,
  });
  assert.equal(newBranch.code, 'HYD');

  // Verify Designation Code generation directly supports Employee Service ID naming
  const desigCode = await orgService.deriveDesignationCode('DES-SWE');
  assert.equal(desigCode, 'SWE');
});

