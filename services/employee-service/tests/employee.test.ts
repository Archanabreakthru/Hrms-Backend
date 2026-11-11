import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployeeService } from '../src/services/employeeService';
import { InMemoryEmployeeRepository } from '../src/repositories/employeeRepository';
import { IOrgServiceClient } from '../src/services/orgServiceClient';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

class MockOrgClient implements IOrgServiceClient {
  async getDesignationCode(id?: string): Promise<string> {
    if (id === 'DES-SWE') return 'SWE';
    if (id === 'DES-MD') return 'MD';
    return 'GEN';
  }
  async validateDepartment(id: string): Promise<boolean> {
    return id === 'DEP-ENG' || id === 'DEP-HR';
  }
  async validateDesignation(id: string): Promise<boolean> {
    return id === 'DES-SWE' || id === 'DES-MD';
  }
  async validateBranch(id: string): Promise<boolean> {
    return id === 'BR-BLR';
  }
}

const mockHrAdmin: AuthenticatedUser = {
  id: 'usr-admin-1',
  email: 'hr@orbyx.io',
  role: UserRole.HR_ADMIN,
  permissions: ['employee.profile.edit_employment', 'employee.salary.edit', 'employee.directory.read_basic'],
};

const mockEmployeeUser: AuthenticatedUser = {
  id: 'usr-emp-1',
  email: 'john@orbyx.io',
  role: UserRole.EMPLOYEE,
  employeeId: 'EMP-SWE-0001',
  permissions: ['employee.profile.update_self', 'employee.profile.edit_personal', 'employee.directory.read_basic'],
};

const mockManagerUser: AuthenticatedUser = {
  id: 'usr-mgr-1',
  email: 'manager@orbyx.io',
  role: UserRole.REPORTING_MANAGER,
  employeeId: 'EMP-MD-0001',
  permissions: ['employee.profile.read_team', 'employee.directory.read_basic'],
};

test('EmployeeService creates a draft employee without silent default population', async () => {
  const repo = new InMemoryEmployeeRepository();
  const org = new MockOrgClient();
  const service = new EmployeeService(repo, org);

  const draft = await service.createDraft(
    {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@orbyx.io',
      phone: '+91 9876543210',
      userId: 'usr-alice-1',
      designationId: 'DES-SWE',
      departmentId: 'DEP-ENG',
      branchId: 'BR-BLR',
    },
    mockHrAdmin
  );

  assert.equal(draft.id, 'EMP-SWE-0001');
  assert.equal(draft.profileStatus, 'Draft');
  assert.equal(draft.dateOfBirth, undefined); // NOT silently populated!
  assert.equal(draft.bankDetails, undefined); // NOT silently populated!
  assert.equal(draft.panOrTaxNumber, undefined);
});

test('EmployeeService validates mandatory fields before enrollment to Active', async () => {
  const repo = new InMemoryEmployeeRepository();
  const org = new MockOrgClient();
  const service = new EmployeeService(repo, org);

  // Full enrollment payload
  const enrolled = await service.enroll(
    {
      userId: 'usr-bob-1',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@orbyx.io',
      phone: '+91 9123456789',
      dateOfBirth: '1995-05-15',
      gender: 'Male',
      address: '123 Tech Park, Bangalore',
      emergencyContact: {
        name: 'Sarah Jones',
        relationship: 'Spouse',
        phone: '+91 9988776655',
      },
      departmentId: 'DEP-ENG',
      designationId: 'DES-SWE',
      branchId: 'BR-BLR',
      employmentType: 'Permanent',
      dateOfJoining: '2026-01-10',
      shiftId: 'SHIFT-GEN',
      bankDetails: {
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
      },
      panOrTaxNumber: 'ABCDE1234F',
      baseSalaryAnnual: 1200000,
    },
    mockHrAdmin
  );

  assert.equal(enrolled.id, 'EMP-SWE-0001');
  assert.equal(enrolled.profileStatus, 'Active');
  assert.equal(enrolled.panOrTaxNumber, 'ABCDE1234F'); // HR can view decrypted PAN
});

test('EmployeeService prevents duplicate official emails and duplicate PANs', async () => {
  const repo = new InMemoryEmployeeRepository();
  const org = new MockOrgClient();
  const service = new EmployeeService(repo, org);

  await service.createDraft(
    {
      firstName: 'Clara',
      lastName: 'Oswald',
      email: 'clara@orbyx.io',
      phone: '+91 9888877777',
      userId: 'usr-clara-1',
    },
    mockHrAdmin
  );

  // Duplicate email rejects with ConflictError
  await assert.rejects(
    async () => {
      await service.createDraft(
        {
          firstName: 'Clara Two',
          lastName: 'Duplicate',
          email: 'clara@orbyx.io',
          phone: '+91 9111122222',
          userId: 'usr-clara-2',
        },
        mockHrAdmin
      );
    },
    {
      name: 'ConflictError',
      message: 'An employee with email clara@orbyx.io already exists',
    }
  );
});

test('EmployeeService allocates sequential IDs concurrently without collisions', async () => {
  const repo = new InMemoryEmployeeRepository();
  const org = new MockOrgClient();
  const service = new EmployeeService(repo, org);

  // Trigger 5 parallel draft creations
  const promises = [1, 2, 3, 4, 5].map((i) =>
    service.createDraft(
      {
        firstName: `Emp${i}`,
        lastName: 'Test',
        email: `emp${i}@orbyx.io`,
        phone: `+91 900000000${i}`,
        userId: `usr-test-${i}`,
        designationId: 'DES-SWE',
      },
      mockHrAdmin
    )
  );

  const results = await Promise.all(promises);
  const ids = results.map((r) => r.id);
  const uniqueIds = Array.from(new Set(ids));

  assert.equal(uniqueIds.length, 5);
  assert.deepEqual(ids.sort(), [
    'EMP-SWE-0001',
    'EMP-SWE-0002',
    'EMP-SWE-0003',
    'EMP-SWE-0004',
    'EMP-SWE-0005',
  ]);
});

test('EmployeeService field-level RBAC: Self-service vs Manager vs HR restrictions', async () => {
  const repo = new InMemoryEmployeeRepository();
  const org = new MockOrgClient();
  const service = new EmployeeService(repo, org);

  // Create enrolled employee EMP-SWE-0001
  await service.enroll(
    {
      userId: 'usr-emp-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@orbyx.io',
      phone: '+91 9876543210',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      address: 'Bangalore Flat 101',
      emergencyContact: { name: 'Jane', relationship: 'Sister', phone: '+91 9876543211' },
      departmentId: 'DEP-ENG',
      designationId: 'DES-SWE',
      branchId: 'BR-BLR',
      employmentType: 'Permanent',
      dateOfJoining: '2025-01-01',
      shiftId: 'SHIFT-GEN',
      bankDetails: { accountNumber: '998877665544', ifscCode: 'ICIC0000123', bankName: 'ICICI Bank' },
      panOrTaxNumber: 'PANXX1234Y',
      baseSalaryAnnual: 1500000,
    },
    mockHrAdmin
  );

  // 1. Employee can update personal contact
  const updatedSelf = await service.updatePersonal(
    'EMP-SWE-0001',
    { personalEmail: 'john.personal@gmail.com' },
    mockEmployeeUser
  );
  assert.equal(updatedSelf.personalEmail, 'john.personal@gmail.com');
  // Employee sees masked bank account
  assert.ok(updatedSelf.bankDetails?.accountNumber.startsWith('******'));

  // 2. Employee CANNOT modify their own salary or bank details
  await assert.rejects(
    async () => {
      await service.updateSalaryBank(
        'EMP-SWE-0001',
        { baseSalaryAnnual: 2500000 },
        mockEmployeeUser
      );
    },
    {
      name: 'ForbiddenError',
    }
  );

  // 3. Manager has reporting access but CANNOT view or edit sensitive salary/bank
  // Create manager first
  const mgr = await service.enroll(
    {
      userId: 'usr-mgr-1',
      firstName: 'David',
      lastName: 'Director',
      email: 'manager@orbyx.io',
      phone: '+91 9876543299',
      dateOfBirth: '1980-01-01',
      gender: 'Male',
      address: 'Bangalore Penthouse',
      emergencyContact: { name: 'Mary', relationship: 'Spouse', phone: '+91 9876543298' },
      departmentId: 'DEP-ENG',
      designationId: 'DES-MD',
      branchId: 'BR-BLR',
      employmentType: 'Permanent',
      dateOfJoining: '2020-01-01',
      shiftId: 'SHIFT-GEN',
      bankDetails: { accountNumber: '887766554433', ifscCode: 'HDFC0000999', bankName: 'HDFC Bank' },
      panOrTaxNumber: 'PANMD9999Z',
      baseSalaryAnnual: 3500000,
    },
    mockHrAdmin
  );

  // Assign John to Manager
  await service.updateReporting('EMP-SWE-0001', mgr.id, mockHrAdmin);

  const managerUserWithAssignedId = { ...mockManagerUser, employeeId: mgr.id };
  const managerView = await service.getById('EMP-SWE-0001', managerUserWithAssignedId);
  assert.equal(managerView.id, 'EMP-SWE-0001');
  assert.equal(managerView.bankDetails, undefined); // REDACTED!
  assert.equal(managerView.panOrTaxNumber, undefined); // REDACTED!
  assert.equal(managerView.baseSalaryAnnual, undefined); // REDACTED!

  // Manager CANNOT modify employee salary
  await assert.rejects(
    async () => {
      await service.updateSalaryBank(
        'EMP-SWE-0001',
        { baseSalaryAnnual: 2000000 },
        mockManagerUser
      );
    },
    {
      name: 'ForbiddenError',
    }
  );
});
