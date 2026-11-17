import test from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceService } from '../src/services/attendanceService';
import { InMemoryAttendanceRepository } from '../src/repositories/attendanceRepository';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

const mockEmployeeUser: AuthenticatedUser = {
  id: 'usr-1',
  email: 'john@orbyx.io',
  role: UserRole.EMPLOYEE,
  employeeId: 'EMP-SWE-0001',
  permissions: ['attendance.punch_self', 'attendance.regularize_self', 'leave.apply_self'],
};

const mockManagerUser: AuthenticatedUser = {
  id: 'usr-mgr-1',
  email: 'mgr@orbyx.io',
  role: UserRole.REPORTING_MANAGER,
  employeeId: 'EMP-MD-0001',
  permissions: ['attendance.approve_team', 'leave.approve_team'],
};

test('AttendanceService handles Clock-In and Clock-Out with net hours and late arrival detection', async () => {
  const repo = new InMemoryAttendanceRepository();
  const service = new AttendanceService(repo);

  // Clock-in at 09:30 AM (on time for 09:30 shift)
  const inRecord = await service.punchClock(
    {
      employeeId: 'EMP-SWE-0001',
      date: '2026-11-10',
      punchType: 'IN',
      timestamp: '2026-11-10T09:30:00Z',
      workMode: 'Office',
      shiftId: 'SHIFT-GEN',
    },
    mockEmployeeUser
  );

  assert.equal(inRecord.status, 'Present');
  assert.equal(inRecord.isLate, false);

  // Duplicate clock-in is rejected
  await assert.rejects(
    async () => {
      await service.punchClock(
        {
          employeeId: 'EMP-SWE-0001',
          date: '2026-11-10',
          punchType: 'IN',
          timestamp: '2026-11-10T09:35:00Z',
        },
        mockEmployeeUser
      );
    },
    {
      name: 'ConflictError',
    }
  );

  // Clock-out at 18:30 PM (9 gross hours - 1 hr break = 8 net hours -> Full Day Present)
  const outRecord = await service.punchClock(
    {
      employeeId: 'EMP-SWE-0001',
      date: '2026-11-10',
      punchType: 'OUT',
      timestamp: '2026-11-10T18:30:00Z',
    },
    mockEmployeeUser
  );

  assert.equal(outRecord.totalWorkingHours, 8);
  assert.equal(outRecord.status, 'Present');
  assert.equal(outRecord.isEarlyDeparture, false);
});

test('AttendanceService leave application checks balance and deducts upon approval', async () => {
  const repo = new InMemoryAttendanceRepository();
  const service = new AttendanceService(repo);

  // Initial balance is 12 days
  const app = await service.applyLeave(
    {
      employeeId: 'EMP-SWE-0001',
      leaveTypeId: 'CL',
      startDate: '2026-12-01',
      endDate: '2026-12-02', // 2 days
      isHalfDay: false,
      reason: 'Personal errand',
    },
    mockEmployeeUser
  );

  assert.equal(app.status, 'Pending');
  assert.equal(app.totalDays, 2);

  // Balance has 2 pending days
  const balBefore = await repo.findLeaveBalance('EMP-SWE-0001', 'CL', 2026);
  assert.equal(balBefore?.pendingDays, 2);
  assert.equal(balBefore?.availableDays, 10);

  // Manager approves leave
  const approved = await service.reviewLeave(app.id, 'Approved', undefined, mockManagerUser);
  assert.equal(approved.status, 'Approved');

  // Balance ledger updated: used = 2, pending = 0, available = 10
  const balAfter = await repo.findLeaveBalance('EMP-SWE-0001', 'CL', 2026);
  assert.equal(balAfter?.usedDays, 2);
  assert.equal(balAfter?.pendingDays, 0);
  assert.equal(balAfter?.availableDays, 10);
});

test('AttendanceService Phase 6C.1: shifts, manual entry, records list, and today query', async () => {
  const repo = new InMemoryAttendanceRepository();
  const service = new AttendanceService(repo);

  const mockHrUser: AuthenticatedUser = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: UserRole.HR_ADMIN,
    employeeId: 'EMP-HR-0001',
    permissions: [
      'attendance.punch_self',
      'attendance.read_team',
      'attendance.read_all',
      'shifts.roster.manage',
      'attendance.approve_all',
    ],
  };

  // 1. Shift Listing & Creation
  const initialShifts = await service.listShifts();
  assert.ok(initialShifts.length >= 1);
  assert.equal(initialShifts[0].code, 'GEN');

  const newShift = await service.createShift(
    {
      code: 'NIGHT',
      name: 'Night Shift (20:00 - 05:00)',
      startTime: '20:00',
      endTime: '05:00',
      isOvernight: true,
    },
    mockHrUser
  );
  assert.equal(newShift.code, 'NIGHT');

  // 2. HR Manual Attendance Entry
  const manualRecord = await service.createManualAttendance(
    {
      employeeId: 'EMP-SWE-0001',
      date: '2026-11-12',
      checkInTime: '2026-11-12T09:00:00Z',
      checkOutTime: '2026-11-12T18:00:00Z',
      shiftId: 'SHIFT-GEN',
      workMode: 'Office',
      status: 'Present',
      notes: 'Approved off-site client engagement',
    },
    mockHrUser
  );
  assert.equal(manualRecord.status, 'Present');
  assert.equal(manualRecord.totalWorkingHours, 9);

  // 3. List Attendance Records with RBAC filter
  const employeeRecords = await service.listAttendanceRecords(
    { employeeId: 'EMP-SWE-0001' },
    mockEmployeeUser
  );
  assert.equal(employeeRecords.length, 1);
  assert.equal(employeeRecords[0].employeeId, 'EMP-SWE-0001');

  // 4. Regularization Flow (Employee requests -> HR reviews)
  const reg = await service.requestRegularization(
    {
      attendanceRecordId: manualRecord.id,
      employeeId: 'EMP-SWE-0001',
      requestedCheckIn: '2026-11-12T08:30:00Z',
      requestedCheckOut: '2026-11-12T18:30:00Z',
      reason: 'Forgot to swipe card at front gate',
    },
    mockEmployeeUser
  );
  assert.ok(reg.status.includes('Pending'));

  const regList = await service.listRegularizations({}, mockHrUser);
  assert.ok(regList.length >= 1);

  const reviewedReg = await service.reviewRegularization(
    reg.id,
    'Approved',
    'Valid explanation',
    mockHrUser
  );
  assert.ok(reviewedReg.status.includes('Approved'));
});

test('AttendanceService Phase 6C.2: leave cancellation, balances, leave types, and holidays', async () => {
  const repo = new InMemoryAttendanceRepository();
  const service = new AttendanceService(repo);

  const mockHrUser: AuthenticatedUser = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: UserRole.HR_ADMIN,
    employeeId: 'EMP-HR-0001',
    permissions: [
      'leave.apply_self',
      'leave.read_team',
      'leave.read_all',
      'leave.approve_all',
      'leave.policies.manage',
    ],
  };

  // 1. Leave Types CRUD
  const leaveTypes = await service.listLeaveTypes();
  assert.ok(leaveTypes.length >= 3);
  assert.equal(leaveTypes[0].code, 'CL');

  const newType = await service.createLeaveType(
    {
      code: 'ML',
      name: 'Maternity Leave',
      annualQuotaDays: 180,
      allowsHalfDay: false,
    },
    mockHrUser
  );
  assert.equal(newType.code, 'ML');

  // 2. Balances Query
  const balances = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
  assert.ok(balances.length >= 3);
  const clBalance = balances.find((b) => b.leaveTypeId === 'CL');
  assert.equal(clBalance?.availableDays, 12);

  // 3. Application & Withdrawal (Cancellation of Pending)
  const app = await service.applyLeave(
    {
      employeeId: 'EMP-SWE-0001',
      leaveTypeId: 'CL',
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      isHalfDay: false,
      reason: 'Personal function',
    },
    mockEmployeeUser
  );
  assert.equal(app.status, 'Pending');

  // Balances reflect pending deduction
  const balAfterApply = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
  const clBalAfterApply = balAfterApply.find((b) => b.leaveTypeId === 'CL');
  assert.equal(clBalAfterApply?.pendingDays, 2);
  assert.equal(clBalAfterApply?.availableDays, 10);

  // Withdraw pending application
  const cancelledApp = await service.cancelLeave(app.id, 'No longer needed', mockEmployeeUser);
  assert.equal(cancelledApp.status, 'Cancelled');

  const balAfterCancel = await service.listLeaveBalances('EMP-SWE-0001', 2026, mockEmployeeUser);
  const clBalAfterCancel = balAfterCancel.find((b) => b.leaveTypeId === 'CL');
  assert.equal(clBalAfterCancel?.pendingDays, 0);
  assert.equal(clBalAfterCancel?.availableDays, 12);

  // 4. Holiday Management
  const initialHolidays = await service.listHolidays(2026, undefined);
  assert.ok(initialHolidays.length >= 1);

  const newHoliday = await service.createHoliday(
    {
      name: 'Independence Day',
      date: '2026-08-15',
      year: 2026,
    },
    mockHrUser
  );
  assert.equal(newHoliday.name, 'Independence Day');

  const updatedHolidays = await service.listHolidays(2026, undefined);
  assert.ok(updatedHolidays.length >= 2);

  await service.deleteHoliday(newHoliday.id, mockHrUser);
  const afterDeleteHolidays = await service.listHolidays(2026, undefined);
  assert.equal(afterDeleteHolidays.length, initialHolidays.length);
});

