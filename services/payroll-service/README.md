# Payroll & Statutory Compliance Service — Orbyx HRMS

## Domain Scope
- **Salary Structures:** Annual CTC definitions, Monthly Gross, Basic, HRA, Special Allowances, Custom Allowances & Deductions.
- **Statutory Compliance Engines:** EPF (employee & employer shares, 15,000 wage ceiling), ESI (gross threshold 21,000), Professional Tax (state slab rules), TDS (Old vs New tax regimes).
- **Payroll Processing Runs:** Monthly pay runs, Loss of Pay (LOP) integration calculated from attendance/leaves, payslip generation and distribution.
- **Salary Advance Deductions:** Recovery schedules, remaining balance tracking, and automated payroll deduction entries.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_payroll_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** SalaryStructures, SalaryComponents, StatutoryConfigurations, PayRuns, Payslips, PayslipLineItems, SalaryAdvances, AdvanceRecoverySchedules.

## Internal Port
- Default: `5004`

