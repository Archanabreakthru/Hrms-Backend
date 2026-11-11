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

