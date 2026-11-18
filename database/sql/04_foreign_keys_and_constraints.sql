-- ============================================================================
-- SCRIPT 04: FOREIGN KEYS AND CONSTRAINTS
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Apply all foreign keys, unique constraints, and domain check constraints.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. AUTH SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE auth.auth_sessions
    ADD CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE auth.role_permissions
    ADD CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES auth.permissions(id) ON DELETE CASCADE;

ALTER TABLE auth.user_roles
    ADD CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATION SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE org.statutory_compliance_configs
    ADD CONSTRAINT fk_statutory_company
    FOREIGN KEY (company_id) REFERENCES org.company_profiles(id) ON DELETE CASCADE;

ALTER TABLE org.branches
    ADD CONSTRAINT fk_branches_company
    FOREIGN KEY (company_id) REFERENCES org.company_profiles(id) ON DELETE SET NULL;

ALTER TABLE org.company_directors
    ADD CONSTRAINT fk_directors_company
    FOREIGN KEY (company_id) REFERENCES org.company_profiles(id) ON DELETE CASCADE;

ALTER TABLE org.departments
    ADD CONSTRAINT fk_departments_branch
    FOREIGN KEY (branch_id) REFERENCES org.branches(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_departments_parent
    FOREIGN KEY (parent_dept_id) REFERENCES org.departments(id) ON DELETE SET NULL;

ALTER TABLE org.designations
    ADD CONSTRAINT fk_designations_department
    FOREIGN KEY (department_id) REFERENCES org.departments(id) ON DELETE SET NULL;

ALTER TABLE org.governance_history
    ADD CONSTRAINT fk_governance_history_member
    FOREIGN KEY (member_id) REFERENCES org.governance_members(id) ON DELETE CASCADE;

ALTER TABLE org.delegations
    ADD CONSTRAINT fk_delegations_delegator
    FOREIGN KEY (delegator_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_delegations_delegate
    FOREIGN KEY (delegate_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE org.policy_acknowledgements
    ADD CONSTRAINT fk_policy_acknowledgements_policy
    FOREIGN KEY (policy_id) REFERENCES org.policy_rules(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEE SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE employee.employees
    ADD CONSTRAINT fk_employees_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES org.departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_employees_designation
    FOREIGN KEY (designation_id) REFERENCES org.designations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_employees_branch
    FOREIGN KEY (branch_id) REFERENCES org.branches(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_employees_shift
    FOREIGN KEY (shift_id) REFERENCES attendance.shifts(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_employees_reporting_manager
    FOREIGN KEY (reporting_manager_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- Cross-link: auth.users(employee_id) -> employee.employees(id)
ALTER TABLE auth.users
    ADD CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- Cross-link: org.departments(head_employee_id) -> employee.employees(id)
ALTER TABLE org.departments
    ADD CONSTRAINT fk_departments_head_employee
    FOREIGN KEY (head_employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- Cross-link: org.governance_members(oversight_target_employee_id) -> employee.employees(id)
ALTER TABLE org.governance_members
    ADD CONSTRAINT fk_governance_members_target_emp
    FOREIGN KEY (oversight_target_employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- Cross-link: org.delegations employee references
ALTER TABLE org.delegations
    ADD CONSTRAINT fk_delegations_delegator_emp
    FOREIGN KEY (delegator_employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_delegations_delegate_emp
    FOREIGN KEY (delegate_employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- Cross-link: org.policy_acknowledgements(employee_id) -> employee.employees(id)
ALTER TABLE org.policy_acknowledgements
    ADD CONSTRAINT fk_policy_acknowledgements_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE;

ALTER TABLE employee.employee_bank_details
    ADD CONSTRAINT fk_bank_details_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE;

ALTER TABLE employee.employee_statutory_details
    ADD CONSTRAINT fk_statutory_details_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE;

ALTER TABLE employee.employee_documents
    ADD CONSTRAINT fk_documents_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_documents_verified_by
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_documents_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE employee.service_records
    ADD CONSTRAINT fk_service_records_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_service_records_prev_desig
    FOREIGN KEY (previous_designation_id) REFERENCES org.designations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_new_desig
    FOREIGN KEY (new_designation_id) REFERENCES org.designations(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_prev_dept
    FOREIGN KEY (previous_department_id) REFERENCES org.departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_new_dept
    FOREIGN KEY (new_department_id) REFERENCES org.departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_prev_mgr
    FOREIGN KEY (previous_reporting_manager_id) REFERENCES employee.employees(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_new_mgr
    FOREIGN KEY (new_reporting_manager_id) REFERENCES employee.employees(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_prev_branch
    FOREIGN KEY (previous_branch_id) REFERENCES org.branches(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_service_records_new_branch
    FOREIGN KEY (new_branch_id) REFERENCES org.branches(id) ON DELETE SET NULL;

ALTER TABLE employee.insurance_policies
    ADD CONSTRAINT fk_insurance_policies_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE;

ALTER TABLE employee.insurance_dependents
    ADD CONSTRAINT fk_insurance_dependents_policy
    FOREIGN KEY (policy_id) REFERENCES employee.insurance_policies(id) ON DELETE CASCADE;

ALTER TABLE employee.insurance_nominees
    ADD CONSTRAINT fk_insurance_nominees_policy
    FOREIGN KEY (policy_id) REFERENCES employee.insurance_policies(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE attendance.holidays
    ADD CONSTRAINT fk_holidays_branch
    FOREIGN KEY (branch_id) REFERENCES org.branches(id) ON DELETE SET NULL;

ALTER TABLE attendance.attendance_records
    ADD CONSTRAINT fk_attendance_records_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_attendance_records_shift
    FOREIGN KEY (shift_id) REFERENCES attendance.shifts(id) ON DELETE RESTRICT;

ALTER TABLE attendance.attendance_regularizations
    ADD CONSTRAINT fk_attendance_regularizations_record
    FOREIGN KEY (attendance_record_id) REFERENCES attendance.attendance_records(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_attendance_regularizations_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_attendance_regularizations_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE attendance.attendance_manual_entries
    ADD CONSTRAINT fk_attendance_manual_entries_approver
    FOREIGN KEY (approved_by) REFERENCES employee.employees(id) ON DELETE RESTRICT;

ALTER TABLE attendance.shift_schedules
    ADD CONSTRAINT fk_shift_schedules_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_shift_schedules_shift
    FOREIGN KEY (shift_id) REFERENCES attendance.shifts(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_shift_schedules_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE attendance.overtime_records
    ADD CONSTRAINT fk_overtime_records_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_overtime_records_attendance
    FOREIGN KEY (attendance_record_id) REFERENCES attendance.attendance_records(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_overtime_records_approver
    FOREIGN KEY (approved_by) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE attendance.leave_balances
    ADD CONSTRAINT fk_leave_balances_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_leave_balances_leave_type
    FOREIGN KEY (leave_type_id) REFERENCES attendance.leave_types(id) ON DELETE CASCADE;

ALTER TABLE attendance.leave_applications
    ADD CONSTRAINT fk_leave_applications_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_leave_applications_leave_type
    FOREIGN KEY (leave_type_id) REFERENCES attendance.leave_types(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_leave_applications_approver
    FOREIGN KEY (approver_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5. EXPENSE SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE expense.expense_claims
    ADD CONSTRAINT fk_expense_claims_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_expense_claims_category
    FOREIGN KEY (category_id) REFERENCES expense.expense_categories(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_expense_claims_approver
    FOREIGN KEY (approver_id) REFERENCES employee.employees(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_expense_claims_hr
    FOREIGN KEY (hr_admin_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE expense.advance_petty_cash
    ADD CONSTRAINT fk_advance_petty_cash_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 6. ASSET SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE asset.assets
    ADD CONSTRAINT fk_assets_category
    FOREIGN KEY (category_id) REFERENCES asset.asset_categories(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assets_current_employee
    FOREIGN KEY (current_employee_id) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE asset.asset_allocations
    ADD CONSTRAINT fk_asset_allocations_asset
    FOREIGN KEY (asset_id) REFERENCES asset.assets(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_asset_allocations_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_asset_allocations_allocated_by
    FOREIGN KEY (allocated_by) REFERENCES employee.employees(id) ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 7. CLIENT SCHEMA FOREIGN KEYS & CONSTRAINTS
-- ----------------------------------------------------------------------------

ALTER TABLE client.client_supervisors
    ADD CONSTRAINT fk_client_supervisors_client
    FOREIGN KEY (client_id) REFERENCES client.client_organizations(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_supervisors_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE client.client_deployments
    ADD CONSTRAINT fk_client_deployments_client
    FOREIGN KEY (client_id) REFERENCES client.client_organizations(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_deployments_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_deployments_supervisor
    FOREIGN KEY (supervisor_id) REFERENCES client.client_supervisors(id) ON DELETE SET NULL;

ALTER TABLE client.client_deployment_extensions
    ADD CONSTRAINT fk_deployment_extensions_deployment
    FOREIGN KEY (deployment_id) REFERENCES client.client_deployments(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_deployment_extensions_extended_by
    FOREIGN KEY (extended_by) REFERENCES employee.employees(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_deployment_extensions_approved_by
    FOREIGN KEY (approved_by) REFERENCES employee.employees(id) ON DELETE SET NULL;

ALTER TABLE client.client_attendance_verifications
    ADD CONSTRAINT fk_client_attendance_record
    FOREIGN KEY (attendance_record_id) REFERENCES attendance.attendance_records(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_attendance_deployment
    FOREIGN KEY (deployment_id) REFERENCES client.client_deployments(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_attendance_client
    FOREIGN KEY (client_id) REFERENCES client.client_organizations(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_attendance_supervisor
    FOREIGN KEY (supervisor_id) REFERENCES client.client_supervisors(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_client_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES employee.employees(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_client_attendance_approved_by
    FOREIGN KEY (company_approved_by) REFERENCES employee.employees(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 8. CHECK CONSTRAINTS ACROSS DOMAINS
-- ----------------------------------------------------------------------------

-- Check: Leave dates consistency
ALTER TABLE attendance.leave_applications
    ADD CONSTRAINT chk_leave_dates CHECK (end_date >= start_date);

-- Check: Shift times consistency
ALTER TABLE attendance.shifts
    ADD CONSTRAINT chk_shift_duration CHECK (total_working_hours > 0 AND total_working_hours <= 24);

-- Check: Overtime hours positive
ALTER TABLE attendance.overtime_records
    ADD CONSTRAINT chk_overtime_hours_positive CHECK (hours > 0);

-- Check: Positive expense claim amount
ALTER TABLE expense.expense_claims
    ADD CONSTRAINT chk_expense_claim_amount_positive CHECK (amount > 0);

-- Check: Advance petty cash amount positive
ALTER TABLE expense.advance_petty_cash
    ADD CONSTRAINT chk_advance_amount_positive CHECK (amount > 0);

-- Check: Client deployment dates consistency
ALTER TABLE client.client_deployments
    ADD CONSTRAINT chk_deployment_dates CHECK (planned_end_date >= start_date);

-- Check: Deployment allocation percentage (0 to 100%)
ALTER TABLE client.client_deployments
    ADD CONSTRAINT chk_deployment_allocation_range CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);

-- Check: Insurance nominee share percentage (0 to 100%)
ALTER TABLE employee.insurance_nominees
    ADD CONSTRAINT chk_nominee_share_range CHECK (share_percentage >= 0 AND share_percentage <= 100);

