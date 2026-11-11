# Orbyx HRMS — Microservices Backend Architecture

This directory houses the microservices backend architecture for the Orbyx HRMS platform. The architecture is engineered around bounded domain contexts derived directly from the Orbyx HRMS product specifications, supporting independent service deployment, isolated data ownership, and horizontal scalability.

---

## 1. Technology Stack

- **Runtime & Language:** Node.js, TypeScript
- **HTTP Framework:** Express.js
- **Database Engine:** PostgreSQL (Independent database per microservice)
- **Object-Relational Mapping:** Prisma ORM
- **API Style:** RESTful JSON APIs via API Gateway
- **Legacy Database:** SQLite (`database/orbyx_hrms.sqlite`) preserved as a reference repository.

---

## 2. System Architecture

```text
                               +----------------------------+
                               |  Frontend Client (React)   |
                               +--------------+-------------+
                                              |
                                     (HTTP / REST JSON)
                                              |
                                              v
                               +----------------------------+
                               |     API Gateway (5000)     |
                               +--------------+-------------+
                                              |
     +-----------------+----------------------+-------------------+-----------------+
     |                 |                      |                   |                 |
     v                 v                      v                   v                 v
+---------+   +-------------------+   +---------------+   +---------------+   +-----------+
|  Auth   |   |   Organization    |   |   Employee    |   |  Attendance   |   |  Payroll  |
| Service |   |  Setup Service    |   |    Service    |   | & Leave Serv. |   |  Service  |
| (5001)  |   |      (5002)       |   |    (5009)     |   |    (5003)     |   |  (5004)   |
+----+----+   +---------+---------+   +-------+-------+   +-------+-------+   +-----+-----+
     |                  |                     |                   |                 |
     v                  v                     v                   v                 v
[Auth DB]          [Org DB]             [Employee DB]       [Attend DB]        [Payroll DB]
(PostgreSQL)      (PostgreSQL)          (PostgreSQL)        (PostgreSQL)       (PostgreSQL)

                       |                      |                   |
                       +----------------------+-------------------+
                                              |
     +-----------------+----------------------+-------------------+
     |                                        |                   |
     v                                        v                   v
+-----------+                        +-----------------+  +---------------+
|  Expense  |                        |  Asset Service  |  |Client Service |
|  Service  |                        |     (5006)      |  |    (5007)     |
|  (5005)   |                        +--------+--------+  +-------+-------+
+-----+-----+                                 |                   |
      |                                       v                   v
      v                                   [Asset DB]          [Client DB]
 [Expense DB]                            (PostgreSQL)        (PostgreSQL)
 (PostgreSQL)                                 |                   |
                                              +---------+---------+
                                                        |
                                                        v
                                               +-----------------+
                                               |  Notification   |
                                               |  & Audit (5008) |
                                               +--------+--------+
                                                        |
                                                        v
                                                [Notification DB]
                                                   (PostgreSQL)
```

---

## 3. Service Responsibility Mapping

| Service | Internal Port | Primary Responsibilities | Target Database |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `5000` | Single entry point, reverse proxy routing, JWT token extraction, CORS, global rate limiting, request correlation tracing. | *Stateless* |
| **Auth Service** | `5001` | User credentials, password hashing, session tokens, RBAC roles/permissions, delegated authority proxying. | `orbyx_auth_db` |
| **Organization Service** | `5002` | Company profile, branches, departments, designations, corporate reporting hierarchy, corporate policy publication and governance. | `orbyx_org_db` |
| **Employee Service** | `5009` | Single source of truth for employee identity, personal profiles, contact info, identity documents, bank accounts, statutory IDs (PAN, Aadhaar, UAN, PF, ESI), onboarding, appraisals, exit clearance. | `orbyx_employee_db` |
| **Attendance Service** | `5003` | Shifts, rosters, holidays, daily clock-in/out punch logs, attendance corrections/regularization, leave quota & balance ledgers, overtime. | `orbyx_attendance_db` |
| **Payroll Service** | `5004` | Salary structures, statutory engines (EPF, ESI, Professional Tax, TDS withholding), pay run calculations, payslip generation, advance recovery. | `orbyx_payroll_db` |
| **Expense Service** | `5005` | Expense category policies, claim submission, receipt management, multi-tier approval flows, travel petty cash requests and settlements. | `orbyx_expense_db` |
| **Asset Service** | `5006` | Hardware inventory, software/digital SaaS subscriptions, license seats, asset allocations to employees/departments, return inspection, exit clearance. | `orbyx_asset_db` |
| **Client Service** | `5007` | Client organization registry, client supervisors, employee client assignments/deployments, client attendance/timesheet validation, client allowances. | `orbyx_client_db` |
| **Notification Service** | `5008` | In-app alerts, transactional email dispatch (approvals, payslips, leaves), and centralized immutable audit logging. | `orbyx_notification_db` |

---

## 4. Directory Structure

```text
backend/
├── api-gateway/                      # Reverse Proxy & Edge Router
│   ├── src/
│   │   ├── config/                   # Gateway configuration & service URLs
│   │   ├── middleware/               # Auth pass-through, rate-limiter, correlation ID
│   │   └── routes/                   # Reverse proxy routes
│   ├── .env.example
│   └── README.md
├── services/                         # Independent Domain Microservices
│   ├── auth-service/                 # Identity, Sessions & RBAC
│   ├── organization-service/         # Org Setup: Companies, Branches, Depts, Roles & Policies
│   ├── employee-service/             # Employee Master: Profiles, Statutory IDs, Docs, Appraisals & Exits
│   ├── attendance-service/           # Shifts, Punches, Corrections & Leaves
│   ├── payroll-service/              # Compensation, Statutory Compliance & Payslips
│   ├── expense-service/              # Claims, Petty Cash & Advances
│   ├── asset-service/                # Hardware & Software Asset Management
│   ├── client-service/               # Client Registry, Deployments & Timesheets
│   └── notification-service/         # In-App Alerts, Email Dispatch & Audit Trails
│       # Each service contains:
│       ├── prisma/                   # Service-specific Prisma schema & migrations
│       ├── src/
│       │   ├── config/               # Database and environment config
│       │   ├── controllers/          # HTTP request handlers
│       │   ├── middleware/           # Service-level authentication & guards
│       │   ├── repositories/         # Prisma query and persistence layer
│       │   ├── routes/               # Express endpoint definitions
│       │   ├── services/             # Core domain business logic
│       │   └── validators/           # Input validation schemas
│       ├── tests/                    # Service unit and integration tests
│       ├── .env.example
│       └── README.md
├── shared/                           # Domain-Agnostic Reusable Kernel
│   ├── src/
│   │   ├── types/                    # Common DTOs, response envelopes, role enums
│   │   ├── utils/                    # Shared logger, crypto, numeric helpers
│   │   └── middleware/               # Global error handler, request context
│   └── README.md
├── database/                         # Preserved Legacy Database
│   └── orbyx_hrms.sqlite             # Preserved SQLite database
├── resources/                        # Project Specifications
│   └── specifications/               # Master product requirement documents
├── package.json                      # Root backend package manifest
├── package-lock.json
└── README.md
```

---

## 5. Database Ownership & Data Isolation

Following the **Database-per-Service** design pattern:
- Each microservice exclusively owns its schema and tables. No service directly queries another service's PostgreSQL database.
- Foreign entity references across services use **immutable identifiers (UUIDs / business codes)** rather than cross-database SQL foreign keys.
- **Legacy SQLite Database:** [`backend/database/orbyx_hrms.sqlite`](file:///c:/Users/Abcom/Desktop/Hrms/backend/database/orbyx_hrms.sqlite) is preserved for reference until future migration scripts are scheduled.

---

## 6. Inter-Service Communication Strategy

1. **Synchronous Requests (REST / HTTP):**
   - For real-time, low-latency queries (e.g., Payroll Service querying Employee Service for bank details and statutory numbers, or querying Attendance Service for Loss of Pay days).
   - Downstream service URLs are configured via environment variables and routed internally behind the API Gateway.
   - Circuit breaker and retry mechanisms are used to handle transient network faults.

2. **Asynchronous Events (Message Bus / Webhooks):**
   - For decoupled, fire-and-forget operations (e.g., Employee termination in `employee-service` triggering Asset return tasks in `asset-service`, exit clearance tasks, and notification dispatch).
   - In production, services publish domain events to an event broker (e.g., Redis Streams / RabbitMQ / Kafka) consumed by the `notification-service` and dependent domains.

3. **Request Correlation:**
   - The API Gateway generates a unique `X-Correlation-Id` on incoming requests and propagates it across internal HTTP headers for distributed tracing.

---

## 7. Business Requirements and Specifications Reference

Detailed functional rules, calculation formulas, and module requirements are preserved in [`resources/specifications/`](file:///c:/Users/Abcom/Desktop/Hrms/backend/resources/specifications):
- `October_27_2026_Product_Requirements.md` — Complete HRMS product requirements.
- `October_28_2026_Corrections_Payroll.md` — Payroll, EPF/ESI statutory rules, and corrections.
- `October_28_2026_MVP_Audit_Implementation.md` — MVP audit findings and domain workflows.
- `October_29_2026_Enterprise_Enhancements.md` — Organization governance, manual attendance, and client deployment specifications.
