# Client Deployment & Client Portal Service — Orbyx HRMS

## Domain Scope
- **Client Organization Registry:** Client profiles, legal names, billing addresses, points of contact, contract terms, active status.
- **Client Supervisors:** Supervisor accounts, assigned client organizations, authorized projects.
- **Client Deployments / Assignments:** Employee assignments to clients, allocation percentage (up to 100%), onsite vs offshore mode, client-specific billing rates, deployment tenure.
- **Assignment Lifecycle:** Independent closure of client assignments separate from employment termination.
- **Client Attendance & Timesheet Verification:** External supervisor verification of client-deployed employees' attendance and overtime.
- **Client-Attributed Expenses & Allowances:** Client-specific travel, onsite allowances, and billing logs.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_client_db`)
- **Legacy SQLite Reference:** Originates from `client_organizations`, `client_supervisors`, `client_deployments`, `client_attendance_records` tables in legacy `orbyx_hrms.sqlite`.
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** ClientOrganizations, ClientSupervisors, ClientDeployments, ClientTimesheets, ClientAttendanceApprovals, ClientExpenseAttributions.

## Internal Port
- Default: `5007`

