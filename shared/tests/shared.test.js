"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("../src/index");
(0, node_test_1.default)('ROLE_PERMISSIONS_MAP assigns correct granular permissions', () => {
    const superAdminPerms = index_1.ROLE_PERMISSIONS_MAP[index_1.UserRole.SUPER_ADMIN];
    strict_1.default.ok(superAdminPerms.includes('system.config.write'));
    strict_1.default.ok(!superAdminPerms.includes('client.portal.login'));
    const clientSupervisorPerms = index_1.ROLE_PERMISSIONS_MAP[index_1.UserRole.CLIENT_SUPERVISOR];
    strict_1.default.ok(clientSupervisorPerms.includes('client.portal.login'));
    strict_1.default.ok(clientSupervisorPerms.includes('client.attendance.verify_deployed'));
    // Ensure client supervisor has no access to internal HR records
    strict_1.default.ok(!clientSupervisorPerms.includes('employee.profile.read_all'));
    strict_1.default.ok(!clientSupervisorPerms.includes('payroll.process'));
});
(0, node_test_1.default)('AppError and subclasses instantiate with correct status codes', () => {
    const notFound = new index_1.NotFoundError('User not found');
    strict_1.default.equal(notFound.statusCode, 404);
    strict_1.default.equal(notFound.code, 'NOT_FOUND');
    const forbidden = new index_1.ForbiddenError('Access denied');
    strict_1.default.equal(forbidden.statusCode, 403);
    strict_1.default.equal(forbidden.code, 'FORBIDDEN');
});
(0, node_test_1.default)('InMemoryEventBus publishes and delivers domain events', async () => {
    const bus = new index_1.InMemoryEventBus();
    let received = false;
    bus.subscribe('attendance.punched', async (event) => {
        strict_1.default.equal(event.eventType, 'ATTENDANCE_PUNCH_RECORDED');
        strict_1.default.equal(event.payload.hours, 8.5);
        received = true;
    });
    const evt = (0, index_1.createEvent)('ATTENDANCE_PUNCH_RECORDED', 'ATT-001', 'Attendance', { hours: 8.5 });
    await bus.publish('attendance.punched', evt);
    strict_1.default.equal(received, true);
});
