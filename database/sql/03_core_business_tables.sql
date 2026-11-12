-- ============================================================================
-- SCRIPT 03: CORE BUSINESS TABLES
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Create all core transactional and business entities across domains.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. AUTH SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: auth.users
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role_code VARCHAR(50) NOT NULL DEFAULT 'employee',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INVITED, SUSPENDED, DEACTIVATED
    employee_id VARCHAR(50), -- Authoritative 1:1 relationship with employee.employees(id)
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_users_email UNIQUE (email),
    CONSTRAINT uq_auth_users_employee_id UNIQUE (employee_id)
);

-- Table: auth.auth_sessions
CREATE TABLE IF NOT EXISTS auth.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL DEFAULT 'employee',
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_sessions_token_hash UNIQUE (token_hash),
    CONSTRAINT uq_auth_sessions_refresh_token UNIQUE (refresh_token)
);

-- Table: auth.role_permissions
CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_role_permissions UNIQUE (role_id, permission_id)
);

-- Table: auth.user_roles
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_auth_user_roles UNIQUE (user_id, role_id)
);

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATION SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: org.departments
CREATE TABLE IF NOT EXISTS org.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    branch_id UUID,
    parent_dept_id UUID,
    head_employee_id VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_departments_code UNIQUE (code)
);

-- Table: org.designations
CREATE TABLE IF NOT EXISTS org.designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    department_id UUID,
    level INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_designations_code UNIQUE (code)
);

-- Table: org.governance_members
CREATE TABLE IF NOT EXISTS org.governance_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL, -- 'Chairman', 'Independent Director', 'Director', 'Board Member', 'Advisor'
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    oversight_target_employee_id VARCHAR(50), -- Links to MD/CEO employee record
    committee_role VARCHAR(150),
    effective_from DATE NOT NULL,
    is_payroll_employee BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: org.governance_history
CREATE TABLE IF NOT EXISTS org.governance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    member_name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'CREATED', 'OVERSIGHT_LINKED', 'ROLE_MODIFIED', 'STATUS_CHANGED'
    effective_date DATE NOT NULL,
    actor_user_id UUID,
    actor_name VARCHAR(150),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: org.delegations
CREATE TABLE IF NOT EXISTS org.delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_user_id UUID NOT NULL,
    delegator_employee_id VARCHAR(50),
    delegate_user_id UUID NOT NULL,
    delegate_employee_id VARCHAR(50),
    permitted_actions TEXT[] NOT NULL, -- APPROVE_LEAVE, APPROVE_ATTENDANCE, etc.
    applicable_modules TEXT[] NOT NULL DEFAULT '{"ALL"}',
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Revoked, Expired
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: org.policy_acknowledgements
CREATE TABLE IF NOT EXISTS org.policy_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    comments TEXT,
    CONSTRAINT uq_policy_acknowledgements UNIQUE (policy_id, employee_id, version)
);

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEE SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: employee.employees
CREATE TABLE IF NOT EXISTS employee.employees (
    id VARCHAR(50) PRIMARY KEY, -- Format: EMP-SWE-0001 or standard EMP-[CODE]-[NUM]
    original_legacy_id VARCHAR(50),
    user_id UUID,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    official_email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    personal_email VARCHAR(255),
    personal_phone VARCHAR(50),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    marital_status VARCHAR(20),
    current_address TEXT,
    permanent_address TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(50),
    department_id UUID,
    designation_id UUID,
    branch_id UUID,
    shift_id UUID,
    reporting_manager_id VARCHAR(50),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Permanent', -- Permanent, Contract, Probation, Intern
    employee_category VARCHAR(100) NOT NULL DEFAULT 'Core Staff',
    employment_status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, On Leave, Probation, Notice Period, Separated, Inactive
    profile_status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Draft, Profile_Incomplete, Pending_Verification, Active, Inactive, Separated
    date_of_joining DATE NOT NULL,
    confirmation_date DATE,
    probation_period_days INTEGER DEFAULT 180,
    notice_period_days INTEGER NOT NULL DEFAULT 60,
    date_of_separation DATE,
    separation_reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_official_email UNIQUE (official_email),
    CONSTRAINT uq_employees_user_id UNIQUE (user_id),
    CONSTRAINT uq_employees_legacy_id UNIQUE (original_legacy_id)
);

-- Table: employee.employee_bank_details
CREATE TABLE IF NOT EXISTS employee.employee_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    branch_name VARCHAR(150),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_bank_details UNIQUE (employee_id)
);

-- Table: employee.employee_statutory_details
CREATE TABLE IF NOT EXISTS employee.employee_statutory_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    pan_number VARCHAR(50),
    pf_uan VARCHAR(50),
    esi_number VARCHAR(50),
    epf_applicable BOOLEAN NOT NULL DEFAULT true,
    epf_wage_ceiling_applied BOOLEAN NOT NULL DEFAULT true,
    esi_applicable BOOLEAN NOT NULL DEFAULT false,
    pt_applicable BOOLEAN NOT NULL DEFAULT true,
    statutory_exemption_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_statutory_details UNIQUE (employee_id)
);

-- Table: employee.employee_documents
CREATE TABLE IF NOT EXISTS employee.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'ID Proof', 'Resume', 'Education Certificate', etc.
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Verified, Rejected
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: employee.service_records
CREATE TABLE IF NOT EXISTS employee.service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    record_type VARCHAR(50) NOT NULL, -- PROMOTION, TRANSFER, CONFIRMATION, DESIGNATION_CHANGE, SALARY_REVISION, SEPARATION, DISCIPLINARY
    effective_date DATE NOT NULL,
    previous_designation_id UUID,
    new_designation_id UUID,
    previous_department_id UUID,
    new_department_id UUID,
    previous_reporting_manager_id VARCHAR(50),
    new_reporting_manager_id VARCHAR(50),
    previous_branch_id UUID,
    new_branch_id UUID,
    previous_employment_type VARCHAR(50),
    new_employment_type VARCHAR(50),
    previous_salary_amount NUMERIC(15,2),
    new_salary_amount NUMERIC(15,2),
    notes TEXT,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    approved_by VARCHAR(50),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: employee.insurance_policies
CREATE TABLE IF NOT EXISTS employee.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    policy_type VARCHAR(100) NOT NULL, -- Group Medical Insurance, Group Term Life, Group Accidental
    provider VARCHAR(150) NOT NULL,
    policy_name VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    group_policy_number VARCHAR(100),
    membership_number VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    coverage_amount NUMERIC(15,2) NOT NULL DEFAULT 500000.00,
    coverage_type VARCHAR(50) NOT NULL DEFAULT 'Self + Family',
    status VARCHAR(50) NOT NULL DEFAULT 'Enrolled', -- Enrolled, Pending, Lapsed, Terminated
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: employee.insurance_dependents
CREATE TABLE IF NOT EXISTS employee.insurance_dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- Spouse, Child, Father, Mother
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    coverage_status VARCHAR(50) NOT NULL DEFAULT 'Covered', -- Covered, Pending, Excluded
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: employee.insurance_nominees
CREATE TABLE IF NOT EXISTS employee.insurance_nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    mobile_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    share_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    is_minor BOOLEAN NOT NULL DEFAULT false,
    guardian_name VARCHAR(150),
    guardian_relationship VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: attendance.attendance_records
CREATE TABLE IF NOT EXISTS attendance.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    shift_id UUID NOT NULL,
    work_mode VARCHAR(50) NOT NULL DEFAULT 'Office', -- Office, Client_Site, Remote
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    break_duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_working_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Present', -- Present, Late, Half Day, Absent, On Leave, Holiday, Weekly Off
    is_late BOOLEAN NOT NULL DEFAULT false,
    is_early_departure BOOLEAN NOT NULL DEFAULT false,
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,
    check_in_latitude NUMERIC(10,7),
    check_in_longitude NUMERIC(10,7),
    check_out_latitude NUMERIC(10,7),
    check_out_longitude NUMERIC(10,7),
    source VARCHAR(50) NOT NULL DEFAULT 'Web', -- Web, Biometric, Mobile, Manual_Entry
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, attendance_date)
);

-- Table: attendance.attendance_regularizations (Correction Requests)
CREATE TABLE IF NOT EXISTS attendance.attendance_regularizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID,
    employee_id VARCHAR(50) NOT NULL,
    target_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ NOT NULL,
    requested_check_out TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, Returned for Correction
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance.attendance_manual_entries (HR Outage / Batch Recovery)
CREATE TABLE IF NOT EXISTS attendance.attendance_manual_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_reference VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL,
    reason_category VARCHAR(100) NOT NULL, -- Biometric Outage, Power Failure, Field Duty, Mass Regularization
    affected_employees_count INTEGER NOT NULL DEFAULT 1,
    justification TEXT NOT NULL,
    approved_by VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance.shift_schedules (Employee Roster)
CREATE TABLE IF NOT EXISTS attendance.shift_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    shift_id UUID NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    assigned_by VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance.overtime_records
CREATE TABLE IF NOT EXISTS attendance.overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    attendance_record_id UUID,
    overtime_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by VARCHAR(50),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: attendance.leave_balances
CREATE TABLE IF NOT EXISTS attendance.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    leave_type_id UUID NOT NULL,
    year INTEGER NOT NULL,
    allocated_days NUMERIC(5,2) NOT NULL,
    used_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    pending_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    carried_forward NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_leave_balance_employee_type_year UNIQUE (employee_id, leave_type_id, year)
);

-- Table: attendance.leave_applications
CREATE TABLE IF NOT EXISTS attendance.leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    leave_type_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    half_day_session VARCHAR(20), -- 'First' or 'Second'
    total_days NUMERIC(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval', -- Pending Approval, Approved, Rejected, Cancelled
    approver_id VARCHAR(50),
    decision_comments TEXT,
    decided_at TIMESTAMPTZ,
    supporting_document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. EXPENSE SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: expense.expense_claims
CREATE TABLE IF NOT EXISTS expense.expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(100) NOT NULL, -- EXP-2026-0001
    employee_id VARCHAR(50) NOT NULL,
    category_id UUID NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    expense_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    receipt_url TEXT,
    receipt_file_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Manager Approval', 
    -- 'Draft', 'Pending Manager Approval', 'Pending Reimbursement', 'Reimbursed', 'Rejected'
    approver_id VARCHAR(50),
    manager_remarks TEXT,
    manager_action_at TIMESTAMPTZ,
    hr_admin_id VARCHAR(50),
    hr_remarks TEXT,
    hr_action_at TIMESTAMPTZ,
    reimbursed_at TIMESTAMPTZ,
    reimbursement_reference VARCHAR(100),
    is_petty_cash BOOLEAN NOT NULL DEFAULT false,
    approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_expense_claims_number UNIQUE (claim_number)
);

-- Table: expense.advance_petty_cash
CREATE TABLE IF NOT EXISTS expense.advance_petty_cash (
    id VARCHAR(50) PRIMARY KEY, -- ADV-2026-101
    employee_id VARCHAR(50) NOT NULL,
    advance_type VARCHAR(50) NOT NULL, -- 'Salary Advance', 'Travel Petty Cash'
    amount NUMERIC(15,2) NOT NULL,
    approved_amount NUMERIC(15,2),
    recovered_amount NUMERIC(15,2) DEFAULT 0.00,
    actual_expense NUMERIC(15,2),
    purpose TEXT NOT NULL,
    request_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval', -- Pending Approval, Approved, Rejected, Disbursed, Settlement Pending, Settled
    payment_reference VARCHAR(100),
    settlement_note TEXT,
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. ASSET SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: asset.assets
CREATE TABLE IF NOT EXISTS asset.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag VARCHAR(100) NOT NULL, -- AST-LAP-001
    asset_name VARCHAR(150) NOT NULL,
    category_id UUID NOT NULL,
    category_name VARCHAR(100) NOT NULL, -- Laptop, Monitor, Software License, etc.
    asset_type VARCHAR(50) NOT NULL DEFAULT 'Hardware', -- 'Hardware', 'Software & Digital'
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150),
    serial_number VARCHAR(100) NOT NULL,
    purchase_date DATE,
    purchase_cost NUMERIC(15,2),
    warranty_expiry DATE,
    license_key TEXT,
    total_seats INTEGER,
    allocated_seats INTEGER DEFAULT 0,
    subscription_expiry DATE,
    renewal_cost NUMERIC(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'Available', -- Available, Allocated, In Maintenance, Damaged, Retired, Inactive
    current_employee_id VARCHAR(50),
    custody_status VARCHAR(50) NOT NULL DEFAULT 'Available', -- Available, Pending Acknowledgement, In Possession, Returned, Disputed
    allocated_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deactivate_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assets_tag UNIQUE (asset_tag),
    CONSTRAINT uq_assets_serial UNIQUE (serial_number)
);

-- Table: asset.asset_allocations (Assignment History)
CREATE TABLE IF NOT EXISTS asset.asset_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    allocated_by VARCHAR(50) NOT NULL,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    condition_on_allocation VARCHAR(50) NOT NULL DEFAULT 'Good', -- Brand New, Good, Fair, Minor Scratches
    returned_at TIMESTAMPTZ,
    condition_on_return VARCHAR(50), -- Brand New, Good, Fair, Minor Scratches, Damaged
    return_notes TEXT,
    is_exit_cleared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. CLIENT SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: client.client_organizations
CREATE TABLE IF NOT EXISTS client.client_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    contract_start DATE,
    contract_end DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Prospect, Inactive
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_client_org_code UNIQUE (code)
);

-- Table: client.client_supervisors
CREATE TABLE IF NOT EXISTS client.client_supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    designation VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Invited, Suspended
    user_id UUID, -- Links to auth.users if granted portal login
    invitation_status VARCHAR(50) NOT NULL DEFAULT 'Accepted', -- Invited, Accepted, Expired, Revoked
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_client_supervisors_email UNIQUE (email),
    CONSTRAINT uq_client_supervisors_user UNIQUE (user_id)
);

-- Table: client.client_deployments (Assignments)
CREATE TABLE IF NOT EXISTS client.client_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    supervisor_id UUID,
    project_name VARCHAR(200) NOT NULL,
    location VARCHAR(150) NOT NULL,
    work_arrangement VARCHAR(50) NOT NULL DEFAULT 'Onsite', -- Onsite, Remote, Hybrid
    start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_end_date DATE,
    allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    monthly_allowance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    billing_rate_hourly NUMERIC(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Scheduled, Active, Extended, On Hold, Completed, Cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: client.client_deployment_extensions
CREATE TABLE IF NOT EXISTS client.client_deployment_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL,
    extended_by VARCHAR(50) NOT NULL,
    extension_reason TEXT NOT NULL,
    previous_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    approved_by VARCHAR(50),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: client.client_attendance_verifications
CREATE TABLE IF NOT EXISTS client.client_attendance_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID NOT NULL, -- Links to authoritative attendance.attendance_records
    deployment_id UUID NOT NULL,
    client_id UUID NOT NULL,
    supervisor_id UUID,
    employee_id VARCHAR(50) NOT NULL,
    verification_date DATE NOT NULL,
    period_key VARCHAR(50) NOT NULL, -- e.g. "2026-11-P1", "2026-11-P2", "2026-11-M1"
    working_hours NUMERIC(4,2) NOT NULL,
    work_mode VARCHAR(50) NOT NULL DEFAULT 'Client Site',
    notes TEXT,
    client_verification_status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    -- Submitted, Pending_Client_Verification, Client_Approved, Client_Rejected, Pending_HR_Verification, HR_Approved, HR_Rejected
    client_verified_at TIMESTAMPTZ,
    client_verified_by VARCHAR(150),
    dispute_details TEXT,
    company_approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    company_approved_at TIMESTAMPTZ,
    company_approved_by VARCHAR(50),
    company_comments TEXT,
    payroll_eligibility_status VARCHAR(50) NOT NULL DEFAULT 'Not_Eligible',
    approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_client_attendance_record UNIQUE (attendance_record_id)
);

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATION SCHEMA CORE TABLES
-- ----------------------------------------------------------------------------

-- Table: notification.notifications
CREATE TABLE IF NOT EXISTS notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id VARCHAR(50) NOT NULL, -- User UUID or Employee ID
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, ERROR, APPROVAL_REQUEST, ACTION_REQUIRED
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP', -- IN_APP, EMAIL, SMS, PUSH
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    link_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: notification.audit_logs
CREATE TABLE IF NOT EXISTS notification.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL, -- employee-service, auth-service, etc.
    action VARCHAR(100) NOT NULL, -- USER_LOGIN, LEAVE_APPLY, ATTENDANCE_PUNCH, etc.
    resource_type VARCHAR(100) NOT NULL, -- Employee, AttendanceRecord, ExpenseClaim, etc.
    resource_id VARCHAR(100),
    actor_id VARCHAR(50) NOT NULL, -- User UUID or Employee ID
    actor_role VARCHAR(50),
    actor_ip INET,
    details JSONB,
    diff JSONB,
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

