# Expense & Reimbursement Service — Orbyx HRMS

## Domain Scope
- **Expense Categories:** Category configuration, spending caps, receipt requirement policies.
- **Employee Expense Claims:** Claim filing, receipt attachment uploads, multi-stage approval workflows (Manager -> Finance).
- **Travel Petty Cash & Advances:** Travel cash requests, approvals, disbursement reference tracking, expense reconciliations, and settlements.
- **Reimbursement Disbursements:** Transaction history, payout references, and accounting status.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_expense_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** ExpenseCategories, ExpenseClaims, ExpenseReceipts, TravelCashRequests, PettyCashDisbursements, ReimbursementPayouts.

## Internal Port
- Default: `5005`

