# Time, Attendance & Leave Service — Orbyx HRMS

## Domain Scope
- **Shift Management:** Shift definitions, rotating shifts, rosters, working days, and organization holiday calendars.
- **Attendance Punch Logs:** Daily clock-in/out, biometric sync, manual punches, geolocation & photo capture audit logs.
- **Attendance Regularization:** Correction requests, missed punch reasons, manager approval workflows.
- **Leave Management:** Leave types (Casual, Sick, Earned, Maternity, Comp-off), annual quota rules, leave applications, manager approvals, balance ledgers.
- **Overtime:** Overtime logging, threshold tracking, and pre-approvals.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_attendance_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** Shifts, ShiftRosters, Holidays, AttendanceRecords, PunchLogs, RegularizationRequests, LeaveTypes, LeaveBalances, LeaveApplications, OvertimeRecords.

## Internal Port
- Default: `5003`

