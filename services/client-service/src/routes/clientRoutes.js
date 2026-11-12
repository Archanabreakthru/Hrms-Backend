"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientRouter = createClientRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const clientValidators_1 = require("../validators/clientValidators");
const env_1 = require("../config/env");
function createClientRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // Client Supervisor Attendance Verification
    router.put('/verifications/:id/verify', authMiddleware, (0, auth_1.requirePermission)('client.attendance.verify_deployed'), (0, validation_1.validateRequest)(clientValidators_1.verifyAttendanceSchema), controller.supervisorVerify);
    // HR Dual-Approval & Dispute Resolution
    router.put('/verifications/:id/hr-approve', authMiddleware, (0, auth_1.requirePermission)('client.verification.hr_resolve'), (0, validation_1.validateRequest)(clientValidators_1.hrApproveSchema), controller.hrResolveAndApprove);
    // Internal Endpoint for Payroll Service
    router.get('/internal/payroll-verification', authMiddleware, controller.getPayrollVerificationSummary);
    return router;
}
