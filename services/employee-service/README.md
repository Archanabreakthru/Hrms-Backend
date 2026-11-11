# Employee Management Service — Orbyx HRMS

## Domain Scope
- **Single Source of Truth for Employee Identity:** Centralized master registry for employee profiles and personal records.
- **Personal & Contact Details:** Full name, gender, date of birth, personal email, phone numbers, current & permanent addresses, emergency contacts.
- **Statutory & Banking Details:** Bank name, account number, IFSC code, PAN, Aadhaar, Universal Account Number (UAN), EPF & ESI member IDs.
- **Document Management & Photo Capture:** Identity proofs, education/experience certificates, employee badge photos, and photo-capture verification audit logs.
- **Employment Lifecycle Transitions:** Onboarding workflow, probation tracking, employment type status (Full-Time, Contract, Intern), department/branch transfers, promotions, and appraisal histories.
- **Exit Formalities & Separation:** Resignation/termination workflows, clearance checklist tracking (IT, Finance, HR, Admin), notice period tracking, and separation status.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_employee_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** Employees, EmployeeProfiles, EmployeeDocuments, EmergencyContacts, BankDetails, StatutoryDetails, EmploymentHistory, Appraisals, ExitClearances.

## Cross-Service Boundaries & Communication
- References `userId` from **Auth Service** (for system login credential linkage).
- References `branchId`, `departmentId`, `designationId`, and `reportingManagerId` from **Organization Service** via immutable UUIDs.
- Emits employee lifecycle domain events (e.g. `EMPLOYEE_CREATED`, `EMPLOYEE_PROMOTED`, `EMPLOYEE_EXIT_INITIATED`) for consumption by **Payroll Service**, **Asset Service**, **Client Service**, and **Notification Service**.

## Internal Port
- Default: `5009`

