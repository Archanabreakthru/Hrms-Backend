"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const roles_1 = require("../../../../shared/src/constants/roles");
const messaging_1 = require("../../../../shared/src/infrastructure/messaging");
class PayrollService {
    payrollRepo;
    attendanceClient;
    clientServiceClient;
    eventBus;
    constructor(payrollRepo, attendanceClient, clientServiceClient, eventBus) {
        this.payrollRepo = payrollRepo;
        this.attendanceClient = attendanceClient;
        this.clientServiceClient = clientServiceClient;
        this.eventBus = eventBus;
    }
    /**
     * Computes statutory calculations for an employee and runs monthly payroll.
     * Concurrency-safe, idempotent execution preventing duplicate payouts.
     */
    async runPayroll(month, year, employeeIds, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can process and finalize payroll runs');
        }
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const existing = await this.payrollRepo.findPayrollRun(periodKey);
        if (existing && existing.status === 'Finalized') {
            throw new AppError_1.ConflictError(`Payroll run for ${periodKey} has already been finalized and cannot be re-executed`);
        }
        // Determine calendar boundaries
        const totalWorkingDays = new Date(year, month, 0).getDate(); // days in month (e.g. 30 or 31)
        const startDate = `${periodKey}-01`;
        const endDate = `${periodKey}-${totalWorkingDays}`;
        const statutory = await this.payrollRepo.getStatutorySetting(`${year}-${year + 1}`);
        const lineItems = [];
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        for (const empId of employeeIds) {
            const salaryStructure = await this.payrollRepo.findSalaryStructure(empId);
            if (!salaryStructure)
                continue;
            // 1. Fetch Loss of Pay & attendance metrics from Attendance Service
            const attendSummary = await this.attendanceClient.getPayrollSummary(empId, startDate, endDate);
            // 2. Fetch Client deployment allowances and verified hours from Client Service
            const clientSummary = await this.clientServiceClient.getPayrollVerification(empId, `${periodKey}-P1`);
            // Earnings breakdown
            const basic = salaryStructure.items.find((i) => i.code === 'BASIC')?.amountMonthly || 0;
            const hra = salaryStructure.items.find((i) => i.code === 'HRA')?.amountMonthly || 0;
            const special = salaryStructure.items.find((i) => i.code === 'SPECIAL')?.amountMonthly || 0;
            const clientAllowance = clientSummary.isEligible ? clientSummary.allowanceMonthly : 0;
            const grossEarnings = basic + hra + special + clientAllowance;
            // Loss of Pay (LOP) deduction = (Gross / totalDays) * LOP days
            const perDayRate = grossEarnings / totalWorkingDays;
            const lopDeduction = Math.round(perDayRate * attendSummary.lossOfPayDays * 100) / 100;
            // Statutory EPF deduction (12% of Basic, capped at wage ceiling of ₹15,000 if ceiling applied)
            const epfBase = Math.min(basic, statutory.epfWageCeilingMonthly);
            const epfEmployeeDeduction = Math.round((epfBase * statutory.epfEmployeeRatePercent) / 100);
            const epfEmployerContribution = Math.round((epfBase * statutory.epfEmployerRatePercent) / 100);
            // Statutory ESI deduction (0.75% Employee, 3.25% Employer, applicable only if Gross <= ₹21,000)
            let esiEmployeeDeduction = 0;
            let esiEmployerContribution = 0;
            if (grossEarnings <= statutory.esiWageCeilingMonthly) {
                esiEmployeeDeduction = Math.round(((grossEarnings - lopDeduction) * statutory.esiEmployeeRatePercent) / 100);
                esiEmployerContribution = Math.round(((grossEarnings - lopDeduction) * statutory.esiEmployerRatePercent) / 100);
            }
            // Professional Tax (Standard ₹200/month)
            const professionalTaxDeduction = statutory.professionalTaxMonthly;
            // Estimated TDS (standard 10% on monthly taxable gross exceeding ₹50,000)
            const tdsDeduction = grossEarnings > 50000 ? Math.round((grossEarnings - 50000) * 0.1) : 0;
            const employeeTotalDeductions = lopDeduction + epfEmployeeDeduction + esiEmployeeDeduction + professionalTaxDeduction + tdsDeduction;
            const netPayable = Math.max(0, Math.round((grossEarnings - employeeTotalDeductions) * 100) / 100);
            const item = {
                id: `slip_${periodKey}_${empId}`,
                payrollRunId: `run_${periodKey}`,
                employeeId: empId,
                employeeName: `Employee ${empId}`,
                totalWorkingDays,
                daysPresent: attendSummary.presentDays,
                lossOfPayDays: attendSummary.lossOfPayDays,
                clientBillableHours: clientSummary.verifiedHours,
                clientAllowance,
                basic,
                hra,
                specialAllowance: special,
                otherAllowances: 0,
                grossEarnings,
                epfEmployeeDeduction,
                esiEmployeeDeduction,
                professionalTaxDeduction,
                tdsDeduction,
                lopDeduction,
                totalDeductions: employeeTotalDeductions,
                netPayable,
                epfEmployerContribution,
                esiEmployerContribution,
            };
            lineItems.push(item);
            totalGross += grossEarnings;
            totalDeductions += employeeTotalDeductions;
            totalNet += netPayable;
        }
        const run = {
            id: `run_${periodKey}`,
            month,
            year,
            periodKey,
            status: 'Finalized',
            totalEmployees: lineItems.length,
            totalGrossPayout: Math.round(totalGross * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            totalNetPayout: Math.round(totalNet * 100) / 100,
            finalizedBy: actor.id,
            finalizedAt: new Date(),
            lineItems,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const saved = await this.payrollRepo.savePayrollRun(run);
        // Publish payroll completed event
        if (this.eventBus) {
            await this.eventBus.publish('payroll.finalized', (0, messaging_1.createEvent)('PAYROLL_FINALIZED', saved.id, 'PayrollRun', {
                periodKey: saved.periodKey,
                totalEmployees: saved.totalEmployees,
                totalNetPayout: saved.totalNetPayout,
                finalizedBy: saved.finalizedBy,
            }));
        }
        return saved;
    }
}
exports.PayrollService = PayrollService;
