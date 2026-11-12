-- ============================================================================
-- SCRIPT 02: MASTER AND REFERENCE TABLES
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Create standalone master, configuration, taxonomy and lookup tables.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. AUTH SCHEMA REFERENCE & RBAC TABLES
-- ----------------------------------------------------------------------------

-- Table: auth.roles
CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_roles_code UNIQUE (code)
);

-- Table: auth.permissions
CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_permissions_code UNIQUE (code)
);

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATION SCHEMA MASTER TABLES
-- ----------------------------------------------------------------------------

-- Table: org.company_profiles
CREATE TABLE IF NOT EXISTS org.company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100), -- CIN
    incorporated_date DATE,
    pan_number VARCHAR(50),
    gst_number VARCHAR(50),
    tan_number VARCHAR(50),
    iec_number VARCHAR(50),
    pf_registration_number VARCHAR(50),
    esi_registration_number VARCHAR(50),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    website VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    zip_code VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
    working_days_per_week INTEGER NOT NULL DEFAULT 5,
    standard_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    fiscal_year_start VARCHAR(10) NOT NULL DEFAULT '04-01',
    governance_mode VARCHAR(50) NOT NULL DEFAULT 'None',
    governance_authority_name VARCHAR(150),
    governance_authority_title VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: org.statutory_compliance_configs
CREATE TABLE IF NOT EXISTS org.statutory_compliance_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    epf_applicable BOOLEAN NOT NULL DEFAULT true,
    epf_employee_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00,
    epf_employer_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00,
    epf_wage_ceiling_monthly NUMERIC(15,2) NOT NULL DEFAULT 15000.00,
    epf_restrict_to_wage_ceiling BOOLEAN NOT NULL DEFAULT false,
    epf_effective_from DATE NOT NULL DEFAULT '2026-04-01',
    epf_exemption_reason TEXT,
    esi_applicable BOOLEAN NOT NULL DEFAULT true,
    esi_gross_threshold_monthly NUMERIC(15,2) NOT NULL DEFAULT 21000.00,
    esi_employee_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.75,
    esi_employer_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 3.25,
    esi_effective_from DATE NOT NULL DEFAULT '2026-04-01',
    esi_exemption_reason TEXT,
    pt_applicable BOOLEAN NOT NULL DEFAULT true,
    pt_state_jurisdiction VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    pt_monthly_slab_amount NUMERIC(15,2) NOT NULL DEFAULT 200.00,
    pt_min_gross_threshold NUMERIC(15,2) NOT NULL DEFAULT 15000.00,
    pt_effective_from DATE NOT NULL DEFAULT '2026-04-01',
    tds_applicable BOOLEAN NOT NULL DEFAULT true,
    tds_financial_year VARCHAR(50) NOT NULL DEFAULT 'FY 2026-27',
    tds_default_regime VARCHAR(100) NOT NULL DEFAULT 'New Regime (FY 2026-27)',
    tds_effective_from DATE NOT NULL DEFAULT '2026-04-01',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_statutory_company UNIQUE (company_id)
);

-- Table: org.branches
CREATE TABLE IF NOT EXISTS org.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    address TEXT,
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branches_code UNIQUE (code)
);

-- Table: org.company_directors
CREATE TABLE IF NOT EXISTS org.company_directors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    appointment_date DATE,
    din VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: org.policy_rules
CREATE TABLE IF NOT EXISTS org.policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL, -- Organization, Leave, Attendance, Payroll, Statutory, Expense, Asset, Client, Employee & Exit
    description TEXT,
    rules_summary TEXT,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from DATE NOT NULL,
    effective_to DATE,
    applicable_to VARCHAR(150) NOT NULL DEFAULT 'All Employees',
    owner_department VARCHAR(100),
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    version_number NUMERIC(4,1) NOT NULL DEFAULT 1.0,
    review_expiry_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_policy_rules_code UNIQUE (code)
);

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEE SCHEMA SEQUENCE REFERENCE
-- ----------------------------------------------------------------------------

-- Table: employee.employee_sequences
CREATE TABLE IF NOT EXISTS employee.employee_sequences (
    prefix VARCHAR(20) PRIMARY KEY, -- 'SWE', 'HRM', 'MD', 'GEN', 'SDM'
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE SCHEMA REFERENCE TABLES
-- ----------------------------------------------------------------------------

-- Table: attendance.shifts
CREATE TABLE IF NOT EXISTS attendance.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_working_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    grace_period_minutes INTEGER NOT NULL DEFAULT 15,
    late_arrival_threshold_minutes INTEGER NOT NULL DEFAULT 30,
    early_departure_threshold_minutes INTEGER NOT NULL DEFAULT 30,
    half_day_threshold_hours NUMERIC(4,2) NOT NULL DEFAULT 4.50,
    full_day_threshold_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    weekly_off_days INTEGER[] NOT NULL DEFAULT '{0,6}', -- 0=Sun, 6=Sat
    workdays_count INTEGER NOT NULL DEFAULT 5,
    is_overnight BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shifts_code UNIQUE (code)
);

-- Table: attendance.leave_types
CREATE TABLE IF NOT EXISTS attendance.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL, -- AL, SL, CL, ML, PL, LOP, CO
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    annual_quota_days NUMERIC(5,2) NOT NULL DEFAULT 12.00,
    is_carry_forward BOOLEAN NOT NULL DEFAULT false,
    max_carry_forward_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    max_consecutive_days INTEGER NOT NULL DEFAULT 10,
    allows_half_day BOOLEAN NOT NULL DEFAULT true,
    requires_doc BOOLEAN NOT NULL DEFAULT false,
    is_encashable BOOLEAN NOT NULL DEFAULT false,
    eligibility_criteria VARCHAR(255) NOT NULL DEFAULT 'All Permanent & Probation Staff',
    effective_date DATE NOT NULL DEFAULT '2026-01-01',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_leave_types_code UNIQUE (code)
);

-- Table: attendance.holidays
CREATE TABLE IF NOT EXISTS attendance.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID, -- Null indicates all branches
    name VARCHAR(150) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_year INTEGER NOT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. EXPENSE SCHEMA REFERENCE TABLES
-- ----------------------------------------------------------------------------

-- Table: expense.expense_categories
CREATE TABLE IF NOT EXISTS expense.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    max_limit_per_claim NUMERIC(15,2) NOT NULL DEFAULT 5000.00,
    requires_receipt BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_expense_categories_code UNIQUE (code)
);

-- ----------------------------------------------------------------------------
-- 6. ASSET SCHEMA REFERENCE TABLES
-- ----------------------------------------------------------------------------

-- Table: asset.asset_categories
CREATE TABLE IF NOT EXISTS asset.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) NOT NULL, -- 'Hardware' or 'Software & Digital'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_categories_name UNIQUE (name)
);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATION SCHEMA REFERENCE TABLES
-- ----------------------------------------------------------------------------

-- Table: notification.notification_templates
CREATE TABLE IF NOT EXISTS notification.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    channels VARCHAR(50)[] NOT NULL DEFAULT '{"IN_APP"}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_templates_key UNIQUE (template_key)
);

