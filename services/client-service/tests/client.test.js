"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const clientService_1 = require("../src/services/clientService");
const clientRepository_1 = require("../src/repositories/clientRepository");
const roles_1 = require("../../../shared/src/constants/roles");
const mockSupervisorUser = {
    id: 'usr-sup-1',
    email: 'v.rao@apexfintech.example.com',
    role: roles_1.UserRole.CLIENT_SUPERVISOR,
    clientId: 'CLI-001',
    permissions: ['client.portal.login', 'client.attendance.verify_deployed', 'client.dispute.raise'],
};
const mockOtherSupervisor = {
    id: 'usr-sup-99',
    email: 'other@client.example.com',
    role: roles_1.UserRole.CLIENT_SUPERVISOR,
    clientId: 'CLI-999', // Different client!
    permissions: ['client.portal.login', 'client.attendance.verify_deployed'],
};
const mockHrAdmin = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: roles_1.UserRole.HR_ADMIN,
    permissions: ['client.verification.hr_resolve', 'client.organizations.manage'],
};
(0, node_test_1.default)('ClientService 5-stage verification workflow with 15-day period key and zero duplicate attendance', async () => {
    const repo = new clientRepository_1.InMemoryClientRepository();
    const service = new clientService_1.ClientService(repo);
    // Stage 1 & 2: Ingest punch event from Attendance Service
    const verif = await service.handleAttendancePunchedEvent({
        attendanceId: 'ATT-2026-11-04-001',
        employeeId: 'EMP-SWE-0001', // actively deployed to CLI-001
        date: '2026-11-04',
        workMode: 'Client Site',
        workingHours: 8.5,
    });
    strict_1.default.ok(verif);
    strict_1.default.equal(verif.periodKey, '2026-11-P1'); // 1st-15th period key
    strict_1.default.equal(verif.clientVerificationStatus, 'Pending_Client_Verification');
    strict_1.default.equal(verif.payrollEligibilityStatus, 'Not_Eligible');
    // Stage 3: Supervisor verifies and approves
    const supervisorApproved = await service.supervisorVerify(verif.id, 'Approved', 'Full day verified on site', mockSupervisorUser);
    strict_1.default.equal(supervisorApproved.clientVerificationStatus, 'Client_Approved');
    // Stage 4 & 5: HR Dual-Approval & Payroll Eligibility confirmation
    const hrApproved = await service.hrResolveAndApprove(verif.id, 'Approved', 'Verified with supervisor billing sheet', mockHrAdmin);
    strict_1.default.equal(hrApproved.clientVerificationStatus, 'HR_Approved');
    strict_1.default.equal(hrApproved.payrollEligibilityStatus, 'Eligible');
    // Query verified summary for Payroll
    const payrollSummary = await service.getVerifiedHoursAndAllowancesForPayroll('EMP-SWE-0001', '2026-11-P1');
    strict_1.default.equal(payrollSummary.verifiedHours, 8.5);
    strict_1.default.equal(payrollSummary.allowanceMonthly, 5000);
    strict_1.default.equal(payrollSummary.isEligible, true);
});
(0, node_test_1.default)('ClientService enforces strict tenant isolation on client supervisors', async () => {
    const repo = new clientRepository_1.InMemoryClientRepository();
    const service = new clientService_1.ClientService(repo);
    const verif = await service.handleAttendancePunchedEvent({
        attendanceId: 'ATT-2026-11-04-002',
        employeeId: 'EMP-SWE-0001',
        date: '2026-11-04',
        workMode: 'Client Site',
        workingHours: 8.0,
    });
    strict_1.default.ok(verif);
    // Supervisor from CLI-999 attempts to approve CLI-001 record
    await strict_1.default.rejects(async () => {
        await service.supervisorVerify(verif.id, 'Approved', 'Unauthorized attempt', mockOtherSupervisor);
    }, {
        name: 'ForbiddenError',
        message: 'Tenant isolation violation: Access denied to other client records',
    });
});
