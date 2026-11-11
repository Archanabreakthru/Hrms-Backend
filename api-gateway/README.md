# API Gateway — Orbyx HRMS

## Overview
The API Gateway serves as the single secure entry point for all frontend client requests (web application, mobile, and third-party integrations). It routes traffic to the appropriate domain microservices, validates JWT tokens, applies rate limiting, enforces CORS policies, and generates request correlation IDs.

## Core Responsibilities
- **Reverse Proxy Routing:** Maps `/api/v1/*` routes to backend domain microservices.
- **Authentication Gateway:** Validates Bearer JWT tokens and forwards decoded user identity headers (`X-User-Id`, `X-User-Role`, `X-Tenant-Id`).
- **Traffic Governance:** Global rate limiting, IP whitelisting, and request throttling.
- **Observability:** Unified request logging, correlation ID tracing (`X-Correlation-Id`), and aggregated health checks (`/health`).
- **CORS Management:** Centralized origin validation for web clients.

## Route Mapping
| Route Prefix | Target Service | Default Internal Port |
| :--- | :--- | :--- |
| `/api/v1/auth/*` | Auth Service | `5001` |
| `/api/v1/org/*` | Organization Service | `5002` |
| `/api/v1/employees/*` | Employee Service | `5009` |
| `/api/v1/attendance/*`, `/api/v1/leaves/*` | Attendance & Leave Service | `5003` |
| `/api/v1/payroll/*` | Payroll Service | `5004` |
| `/api/v1/expenses/*` | Expense Service | `5005` |
| `/api/v1/assets/*` | Asset Service | `5006` |
| `/api/v1/clients/*` | Client Service | `5007` |
| `/api/v1/notifications/*` | Notification Service | `5008` |
