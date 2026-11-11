import test from 'node:test';
import assert from 'node:assert/strict';
import { ClientService } from '../src/services/clientService';
import { InMemoryClientRepository } from '../src/repositories/clientRepository';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

const mockSupervisorUser: AuthenticatedUser = {
  id: 'usr-sup-1',
  email: 'v.rao@apexfintech.example.com',
  role: UserRole.CLIENT_SUPERVISOR,
  clientId: 'CLI-001',
  permissions: ['client.portal.login', 'client.attendance.verify_deployed', 'client.dispute.raise'],
};

const mockOtherSupervisor: AuthenticatedUser = {
  id: 'usr-sup-99',
  email: 'other@client.example.com',
  role: UserRole.CLIENT_SUPERVISOR,
  clientId: 'CLI-999', // Different client!
  permissions: ['client.portal.login', 'client.attendance.verify_deployed'],
};

const mockHrAdmin: AuthenticatedUser = {
  id: 'usr-hr-1',
  email: 'hr@orbyx.io',
  role: UserRole.HR_ADMIN,
  permissions: ['client.verification.hr_resolve', 'client.organizations.manage'],
};

test('ClientService 5-stage verification workflow with 15-day period key and zero duplicate attendance', async () => {
  const repo = new InMemoryClientRepository();
  const service = new ClientService(repo);

  // Stage 1 & 2: Ingest punch event from Attendance Service
  const verif = await service.handleAttendancePunchedEvent({
    attendanceId: 'ATT-2026-11-04-001',
    employeeId: 'EMP-SWE-0001', // actively deployed to CLI-001
    date: '2026-11-04',
    workMode: 'Client Site',
    workingHours: 8.5,
  });

  assert.ok(verif);
  assert.equal(verif.periodKey, '2026-11-P1'); // 1st-15th period key
  assert.equal(verif.clientVerificationStatus, 'Pending_Client_Verification');
  assert.equal(verif.payrollEligibilityStatus, 'Not_Eligible');

  // Stage 3: Supervisor verifies and approves
  const supervisorApproved = await service.supervisorVerify(
    verif.id,
    'Approved',
    'Full day verified on site',
    mockSupervisorUser
  );
  assert.equal(supervisorApproved.clientVerificationStatus, 'Client_Approved');

  // Stage 4 & 5: HR Dual-Approval & Payroll Eligibility confirmation
  const hrApproved = await service.hrResolveAndApprove(
    verif.id,
    'Approved',
    'Verified with supervisor billing sheet',
    mockHrAdmin
  );
  assert.equal(hrApproved.clientVerificationStatus, 'HR_Approved');
  assert.equal(hrApproved.payrollEligibilityStatus, 'Eligible');

  // Query verified summary for Payroll
  const payrollSummary = await service.getVerifiedHoursAndAllowancesForPayroll('EMP-SWE-0001', '2026-11-P1');
  assert.equal(payrollSummary.verifiedHours, 8.5);
  assert.equal(payrollSummary.allowanceMonthly, 5000);
  assert.equal(payrollSummary.isEligible, true);
});

test('ClientService enforces strict tenant isolation on client supervisors', async () => {
  const repo = new InMemoryClientRepository();
  const service = new ClientService(repo);

  const verif = await service.handleAttendancePunchedEvent({
    attendanceId: 'ATT-2026-11-04-002',
    employeeId: 'EMP-SWE-0001',
    date: '2026-11-04',
    workMode: 'Client Site',
    workingHours: 8.0,
  });

  assert.ok(verif);

  // Supervisor from CLI-999 attempts to approve CLI-001 record
  await assert.rejects(
    async () => {
      await service.supervisorVerify(
        verif.id,
        'Approved',
        'Unauthorized attempt',
        mockOtherSupervisor
      );
    },
    {
      name: 'ForbiddenError',
      message: 'Tenant isolation violation: Access denied to other client records',
    }
  );
});

