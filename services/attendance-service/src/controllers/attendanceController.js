"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
class AttendanceController {
    attendanceService;
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    punch = async (req, res, next) => {
        try {
            const record = await this.attendanceService.punchClock(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, record, 200);
        }
        catch (err) {
            next(err);
        }
    };
    requestRegularization = async (req, res, next) => {
        try {
            const reg = await this.attendanceService.requestRegularization(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, reg, 201);
        }
        catch (err) {
            next(err);
        }
    };
    reviewRegularization = async (req, res, next) => {
        try {
            const { decision, remarks } = req.body;
            const reg = await this.attendanceService.reviewRegularization(req.params.id, decision, remarks, req.user);
            (0, apiResponse_1.apiSuccess)(res, reg, 200);
        }
        catch (err) {
            next(err);
        }
    };
    applyLeave = async (req, res, next) => {
        try {
            const leave = await this.attendanceService.applyLeave(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, leave, 201);
        }
        catch (err) {
            next(err);
        }
    };
    reviewLeave = async (req, res, next) => {
        try {
            const { decision, rejectionReason } = req.body;
            const leave = await this.attendanceService.reviewLeave(req.params.id, decision, rejectionReason, req.user);
            (0, apiResponse_1.apiSuccess)(res, leave, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getPayrollSummary = async (req, res, next) => {
        try {
            const { employeeId, startDate, endDate } = req.query;
            const summary = await this.attendanceService.getMonthlySummaryForPayroll(employeeId, startDate, endDate);
            (0, apiResponse_1.apiSuccess)(res, summary, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AttendanceController = AttendanceController;
