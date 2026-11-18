-- ============================================================================
-- SCRIPT 01: SCHEMA SETUP
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Create the 9 approved domain schemas and required extensions.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- DO NOT RUN DROP DATABASE OR DROP SCHEMA CASCADE.
-- ============================================================================


-- Ensure standard UUID generation extension exists in public
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Approved Nine Domain Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS employee;
CREATE SCHEMA IF NOT EXISTS attendance;
CREATE SCHEMA IF NOT EXISTS payroll; -- Scope preserved; schema created for structural compliance
CREATE SCHEMA IF NOT EXISTS expense;
CREATE SCHEMA IF NOT EXISTS asset;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS notification;

COMMENT ON SCHEMA auth IS 'Authentication, users, sessions, roles, permissions and RBAC access control';
COMMENT ON SCHEMA org IS 'Company, branches, departments, designations, directors, policies and governance hierarchy';
COMMENT ON SCHEMA employee IS 'Employee profiles, lifecycle, service history, documents, bank details and insurance records';
COMMENT ON SCHEMA attendance IS 'Attendance records, punches, shifts, overtime, holidays, leave types, balances and regularization';
COMMENT ON SCHEMA payroll IS 'Payroll domain schema (EXCLUDED from active table definitions in current scope)';
COMMENT ON SCHEMA expense IS 'Expense categories, employee claims, receipts, approval tracking and petty cash advances';
COMMENT ON SCHEMA asset IS 'Hardware assets, digital/software licenses, allocations and custody lifecycle';
COMMENT ON SCHEMA client IS 'Client organizations, supervisors, onsite/remote employee deployments and verification records';
COMMENT ON SCHEMA notification IS 'In-app notifications, delivery channels, templates and append-only system audit logs';

