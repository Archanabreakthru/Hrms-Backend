-- ============================================================================
-- SCRIPT 05: INDEXES
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Create performance indexes for search, filtering, and foreign key queries.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. AUTH SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users (email);
CREATE INDEX IF NOT EXISTS idx_auth_users_employee_id ON auth.users (employee_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_role_status ON auth.users (role_code, status);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth.auth_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_role_permissions_role ON auth.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_auth_role_permissions_perm ON auth.role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_auth_user_roles_user ON auth.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_roles_role ON auth.user_roles (role_id);

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATION SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON org.branches (company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch_id ON org.departments (branch_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_dept_id ON org.departments (parent_dept_id);
CREATE INDEX IF NOT EXISTS idx_departments_head_emp ON org.departments (head_employee_id);

CREATE INDEX IF NOT EXISTS idx_designations_department_id ON org.designations (department_id);
CREATE INDEX IF NOT EXISTS idx_designations_level ON org.designations (level);

CREATE INDEX IF NOT EXISTS idx_governance_members_target_emp ON org.governance_members (oversight_target_employee_id);
CREATE INDEX IF NOT EXISTS idx_governance_history_member_id ON org.governance_history (member_id);

CREATE INDEX IF NOT EXISTS idx_delegations_delegator_user ON org.delegations (delegator_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegate_user ON org.delegations (delegate_user_id);
CREATE INDEX IF NOT EXISTS idx_delegations_dates_status ON org.delegations (effective_from, effective_to, status);

CREATE INDEX IF NOT EXISTS idx_policy_rules_module_status ON org.policy_rules (module, is_active);
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy_emp ON org.policy_acknowledgements (policy_id, employee_id);

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEE SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employee.employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_designation_id ON employee.employees (designation_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employee.employees (branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id ON employee.employees (reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employee.employees (employment_status, profile_status);
CREATE INDEX IF NOT EXISTS idx_employees_name_search ON employee.employees (first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_employee_bank_emp ON employee.employee_bank_details (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_statutory_emp ON employee.employee_statutory_details (employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_docs_employee_id ON employee.employee_documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_docs_category ON employee.employee_documents (document_type);

CREATE INDEX IF NOT EXISTS idx_service_records_employee_id ON employee.service_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_service_records_effective_date ON employee.service_records (effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_employee_id ON employee.insurance_policies (employee_id);
CREATE INDEX IF NOT EXISTS idx_insurance_dependents_policy_id ON employee.insurance_dependents (policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_nominees_policy_id ON employee.insurance_nominees (policy_id);

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON attendance.attendance_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance.attendance_records (attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_shift_id ON attendance.attendance_records (shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_emp_date ON attendance.attendance_records (employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_reg_employee_id ON attendance.attendance_regularizations (employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_reg_record_id ON attendance.attendance_regularizations (attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_attendance_reg_status ON attendance.attendance_regularizations (status);

CREATE INDEX IF NOT EXISTS idx_shift_schedules_emp_dates ON attendance.shift_schedules (employee_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_overtime_employee_date ON attendance.overtime_records (employee_id, overtime_date);

CREATE INDEX IF NOT EXISTS idx_leave_balances_emp_year ON attendance.leave_balances (employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_apps_employee_id ON attendance.leave_applications (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_apps_dates ON attendance.leave_applications (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_apps_status ON attendance.leave_applications (status);
CREATE INDEX IF NOT EXISTS idx_holidays_year_branch ON attendance.holidays (holiday_year, branch_id);

-- ----------------------------------------------------------------------------
-- 5. EXPENSE SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_id ON expense.expense_claims (employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_category_id ON expense.expense_claims (category_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense.expense_claims (status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_expense_date ON expense.expense_claims (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_advance_petty_cash_emp_status ON expense.advance_petty_cash (employee_id, status);

-- ----------------------------------------------------------------------------
-- 6. ASSET SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_assets_category_id ON asset.assets (category_id);
CREATE INDEX IF NOT EXISTS idx_assets_current_emp ON asset.assets (current_employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_status_type ON asset.assets (status, asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_allocations_asset_id ON asset.asset_allocations (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_allocations_employee_id ON asset.asset_allocations (employee_id);

-- ----------------------------------------------------------------------------
-- 7. CLIENT SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_client_supervisors_client_id ON client.client_supervisors (client_id);
CREATE INDEX IF NOT EXISTS idx_client_deployments_client_id ON client.client_deployments (client_id);
CREATE INDEX IF NOT EXISTS idx_client_deployments_employee_id ON client.client_deployments (employee_id);
CREATE INDEX IF NOT EXISTS idx_client_deployments_status ON client.client_deployments (status);

CREATE INDEX IF NOT EXISTS idx_client_att_record_id ON client.client_attendance_verifications (attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_client_att_emp_period ON client.client_attendance_verifications (employee_id, period_key);
CREATE INDEX IF NOT EXISTS idx_client_att_client_status ON client.client_attendance_verifications (client_id, client_verification_status);

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATION SCHEMA INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notification.notifications (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notification.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_service_action ON notification.audit_logs (service_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON notification.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON notification.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON notification.audit_logs (created_at DESC);

