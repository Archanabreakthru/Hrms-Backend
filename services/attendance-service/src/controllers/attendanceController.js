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
            const { decision, remarks, stage } = req.body;
            const reg = await this.attendanceService.reviewRegularization(req.params.id, decision, remarks, stage, req.user);
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
    listRecords = async (req, res, next) => {
        try {
            const { employeeId, startDate, endDate } = req.query;
            const records = await this.attendanceService.listAttendanceRecords({ employeeId, startDate, endDate }, req.user);
            (0, apiResponse_1.apiSuccess)(res, records, 200);
        }
        catch (err) {
            next(err);
        }
    };
    getToday = async (req, res, next) => {
        try {
            const targetEmployeeId = req.query.employeeId || req.user.employeeId;
            if (!targetEmployeeId) {
                (0, apiResponse_1.apiSuccess)(res, null, 200);
                return;
            }
            const record = await this.attendanceService.getTodayAttendanceRecord(targetEmployeeId, req.user);
            (0, apiResponse_1.apiSuccess)(res, record, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listShifts = async (req, res, next) => {
        try {
            const shifts = await this.attendanceService.listShifts();
            (0, apiResponse_1.apiSuccess)(res, shifts, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createShift = async (req, res, next) => {
        try {
            const shift = await this.attendanceService.createShift(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, shift, 201);
        }
        catch (err) {
            next(err);
        }
    };
    listRegularizations = async (req, res, next) => {
        try {
            const { employeeId, status } = req.query;
            const regs = await this.attendanceService.listRegularizations({ employeeId, status }, req.user);
            (0, apiResponse_1.apiSuccess)(res, regs, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createManualEntry = async (req, res, next) => {
        try {
            const record = await this.attendanceService.createManualAttendance(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, record, 201);
        }
        catch (err) {
            next(err);
        }
    };
    listLeaves = async (req, res, next) => {
        try {
            const { employeeId, status } = req.query;
            const leaves = await this.attendanceService.listLeaveApplications({ employeeId, status }, req.user);
            (0, apiResponse_1.apiSuccess)(res, leaves, 200);
        }
        catch (err) {
            next(err);
        }
    };
    cancelLeave = async (req, res, next) => {
        try {
            const { reason } = req.body;
            const app = await this.attendanceService.cancelLeave(req.params.id, reason, req.user);
            (0, apiResponse_1.apiSuccess)(res, app, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listBalances = async (req, res, next) => {
        try {
            const employeeId = req.query.employeeId || req.user.employeeId;
            const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
            const balances = await this.attendanceService.listLeaveBalances(employeeId, year, req.user);
            (0, apiResponse_1.apiSuccess)(res, balances, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listLeaveTypes = async (req, res, next) => {
        try {
            const types = await this.attendanceService.listLeaveTypes();
            (0, apiResponse_1.apiSuccess)(res, types, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createLeaveType = async (req, res, next) => {
        try {
            const type = await this.attendanceService.createLeaveType(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, type, 201);
        }
        catch (err) {
            next(err);
        }
    };
    updateLeaveType = async (req, res, next) => {
        try {
            const type = await this.attendanceService.updateLeaveType(req.params.id, req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, type, 200);
        }
        catch (err) {
            next(err);
        }
    };
    listHolidays = async (req, res, next) => {
        try {
            const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
            const branchId = req.query.branchId;
            const holidays = await this.attendanceService.listHolidays(year, branchId);
            (0, apiResponse_1.apiSuccess)(res, holidays, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createHoliday = async (req, res, next) => {
        try {
            const holiday = await this.attendanceService.createHoliday(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, holiday, 201);
        }
        catch (err) {
            next(err);
        }
    };
    deleteHoliday = async (req, res, next) => {
        try {
            await this.attendanceService.deleteHoliday(req.params.id, req.user);
            (0, apiResponse_1.apiSuccess)(res, { message: 'Holiday deleted successfully' }, 200);
        }
        catch (err) {
            next(err);
        }
    };
    createShiftSchedule = async (req, res, next) => {
        try {
            const schedule = await this.attendanceService.createShiftSchedule(req.body, req.user);
            (0, apiResponse_1.apiSuccess)(res, schedule, 201);
        }
        catch (err) {
            next(err);
        }
    };
    listShiftSchedules = async (req, res, next) => {
        try {
            const { employeeId, shiftId, isActive } = req.query;
            const schedules = await this.attendanceService.listShiftSchedules({
                employeeId,
                shiftId,
                isActive: isActive !== undefined ? isActive === 'true' : undefined,
            }, req.user);
            (0, apiResponse_1.apiSuccess)(res, schedules, 200);
        }
        catch (err) {
            next(err);
        }
    };
}
exports.AttendanceController = AttendanceController;
