# Shared Kernel — Orbyx HRMS

## Overview
The Shared Kernel houses domain-agnostic utilities, shared TypeScript types/DTOs, standard HTTP response interfaces, custom error classes, and common Express middleware used across the Orbyx HRMS microservices.

## Directory Structure
- `src/types/`: Shared interfaces, pagination schemas, standard API response envelopes, and role definitions.
- `src/utils/`: Common loggers, date/time formatters, crypto helpers, and numeric precision calculation helpers.
- `src/middleware/`: Global error handler, correlation ID injector, and token extraction helpers.

## Architectural Rule
Do **not** place domain-specific business logic or database models into `shared/`. It is strictly reserved for reusable, stateless utilities and shared type contracts.

