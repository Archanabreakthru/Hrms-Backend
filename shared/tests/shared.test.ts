import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  UserRole,
  ROLE_PERMISSIONS_MAP,
  AppError,
  NotFoundError,
  ForbiddenError,
  createEvent,
  InMemoryEventBus,
} from '../src/index';

test('ROLE_PERMISSIONS_MAP assigns correct granular permissions', () => {
  const superAdminPerms = ROLE_PERMISSIONS_MAP[UserRole.SUPER_ADMIN];
  assert.ok(superAdminPerms.includes('system.config.write'));
  assert.ok(!superAdminPerms.includes('client.portal.login'));

  const clientSupervisorPerms = ROLE_PERMISSIONS_MAP[UserRole.CLIENT_SUPERVISOR];
  assert.ok(clientSupervisorPerms.includes('client.portal.login'));
  assert.ok(clientSupervisorPerms.includes('client.attendance.verify_deployed'));
  // Ensure client supervisor has no access to internal HR records
  assert.ok(!clientSupervisorPerms.includes('employee.profile.read_all'));
  assert.ok(!clientSupervisorPerms.includes('payroll.process'));
});

test('AppError and subclasses instantiate with correct status codes', () => {
  const notFound = new NotFoundError('User not found');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');

  const forbidden = new ForbiddenError('Access denied');
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.code, 'FORBIDDEN');
});

test('InMemoryEventBus publishes and delivers domain events', async () => {
  const bus = new InMemoryEventBus();
  let received = false;

  bus.subscribe('attendance.punched', async (event) => {
    assert.equal(event.eventType, 'ATTENDANCE_PUNCH_RECORDED');
    assert.equal((event.payload as any).hours, 8.5);
    received = true;
  });

  const evt = createEvent('ATTENDANCE_PUNCH_RECORDED', 'ATT-001', 'Attendance', { hours: 8.5 });
  await bus.publish('attendance.punched', evt);

  assert.equal(received, true);
});

