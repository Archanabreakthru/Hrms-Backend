"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPayrollRouter = createPayrollRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const auth_1 = require("../../../../shared/src/middleware/auth");
const payrollValidators_1 = require("../validators/payrollValidators");
const env_1 = require("../config/env");
function createPayrollRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.config.jwtSecret, env_1.config.jwtIssuer, env_1.config.jwtAudience);
    // Process Payroll (Requires HR Admin / payroll.process permission)
    router.post('/runs', authMiddleware, (0, auth_1.requirePermission)('payroll.process', 'payroll.run.execute'), (0, validation_1.validateRequest)(payrollValidators_1.runPayrollSchema), controller.runPayroll);
    return router;
}
