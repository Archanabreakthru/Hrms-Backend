# Auth & Identity Service — Orbyx HRMS

## Domain Scope
- User authentication, login, logout, refresh tokens, and password reset flows.
- RBAC (Role-Based Access Control) claims: `HR_ADMIN`, `SENIOR_MANAGEMENT`, `EMPLOYEE`, `MANAGER`, `CLIENT_SUPERVISOR`.
- Delegated authority management (acting on behalf of an approver, temporary approval delegations).
- Active session management and token lifecycle revocation.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_auth_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** Users, Roles, Permissions, UserRoles, RefreshTokens, Delegations, SessionAuditLogs.

## Internal Port
- Default: `5001`

