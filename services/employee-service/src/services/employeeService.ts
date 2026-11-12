import { IEmployeeRepository, EmployeeRecord } from '../repositories/employeeRepository';
import { IOrgServiceClient } from './orgServiceClient';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../../../shared/src/errors/AppError';
import { AuthenticatedUser } from '../../../../shared/src/contracts/auth';
import { UserRole } from '../../../../shared/src/constants/roles';
import { EventPublisher, createEvent } from '../../../../shared/src/infrastructure/messaging';
import { encryptField, decryptField } from '../utils/crypto';

export class EmployeeService {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private orgClient: IOrgServiceClient,
    private eventBus?: EventPublisher
  ) {}

  /**
   * Creates a draft employee profile.
   * Can contain partial information.
   */
  async createDraft(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      userId: string;
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      employmentType?: 'Permanent' | 'Contract' | 'Probation' | 'Intern';
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    // 1. Uniqueness checks
    const existingEmail = await this.employeeRepo.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError(`An employee with email ${data.email} already exists`);
    }

    const existingUser = await this.employeeRepo.findByUserId(data.userId);
    if (existingUser) {
      throw new ConflictError(`User ${data.userId} is already assigned to employee ${existingUser.id}`);
    }

    // 2. Validate organization references if provided
    if (data.departmentId) {
      const valid = await this.orgClient.validateDepartment(data.departmentId);
      if (!valid) throw new ValidationError(`Department ${data.departmentId} does not exist`);
    }
    if (data.designationId) {
      const valid = await this.orgClient.validateDesignation(data.designationId);
      if (!valid) throw new ValidationError(`Designation ${data.designationId} does not exist`);
    }
    if (data.branchId) {
      const valid = await this.orgClient.validateBranch(data.branchId);
      if (!valid) throw new ValidationError(`Branch ${data.branchId} does not exist`);
    }

    // 3. Concurrency-safe ID allocation
    const desigCode = await this.orgClient.getDesignationCode(data.designationId);
    const employeeId = await this.employeeRepo.allocateNextId(desigCode);

    const now = new Date();
    const newEmployee: EmployeeRecord = {
      id: employeeId,
      userId: data.userId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      departmentId: data.departmentId,
      designationId: data.designationId,
      branchId: data.branchId,
      employmentType: data.employmentType || 'Permanent',
      status: 'Active',
      profileStatus: 'Draft',
      noticePeriodDays: 30,
      epfApplicable: true,
      epfWageCeilingApplied: true,
      esiApplicable: false,
      ptApplicable: true,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.employeeRepo.create(newEmployee);

    // Publish event
    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.created',
        createEvent('EMPLOYEE_CREATED', saved.id, 'Employee', {
          employeeId: saved.id,
          userId: saved.userId,
          email: saved.email,
          profileStatus: 'Draft',
          actorId: actor.id,
        })
      );
    }

    return this.redactSensitive(saved, actor);
  }

  /**
   * Finalizes complete employee enrollment (Active status).
   * Validates all mandatory statutory, banking, personal and emergency information.
   */
  async enroll(
    data: {
      id?: string;
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      gender: string;
      address: string;
      emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
      };
      departmentId: string;
      designationId: string;
      branchId: string;
      employmentType: 'Permanent' | 'Contract' | 'Probation' | 'Intern';
      dateOfJoining: string;
      noticePeriodDays?: number;
      shiftId: string;
      bankDetails: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        branchName?: string;
      };
      panOrTaxNumber: string;
      pfUan?: string;
      esiNumber?: string;
      baseSalaryAnnual?: number;
      salaryStructureId?: string;
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    // 1. Validate Organization Service entities
    const [deptValid, desigValid, branchValid] = await Promise.all([
      this.orgClient.validateDepartment(data.departmentId),
      this.orgClient.validateDesignation(data.designationId),
      this.orgClient.validateBranch(data.branchId),
    ]);

    if (!deptValid) throw new ValidationError(`Department ${data.departmentId} is invalid`);
    if (!desigValid) throw new ValidationError(`Designation ${data.designationId} is invalid`);
    if (!branchValid) throw new ValidationError(`Branch ${data.branchId} is invalid`);

    // 2. Uniqueness checks
    const panCheck = await this.employeeRepo.findByPan(data.panOrTaxNumber);
    if (panCheck && panCheck.id !== data.id) {
      throw new ConflictError(`PAN ${data.panOrTaxNumber} is already associated with employee ${panCheck.id}`);
    }

    let targetEmployee: EmployeeRecord;
    const now = new Date();

    if (data.id) {
      // Transitioning an existing draft
      const existing = await this.employeeRepo.findById(data.id);
      if (!existing) throw new NotFoundError(`Employee with ID ${data.id} does not exist`);
      targetEmployee = existing;
    } else {
      // Brand new complete enrollment
      const emailCheck = await this.employeeRepo.findByEmail(data.email);
      if (emailCheck) {
        throw new ConflictError(`An employee with email ${data.email} already exists`);
      }
      const userCheck = await this.employeeRepo.findByUserId(data.userId);
      if (userCheck) {
        throw new ConflictError(`User ${data.userId} is already assigned to employee ${userCheck.id}`);
      }

      const desigCode = await this.orgClient.getDesignationCode(data.designationId);
      const newId = await this.employeeRepo.allocateNextId(desigCode);

      targetEmployee = {
        id: newId,
        userId: data.userId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone.trim(),
        employmentType: data.employmentType,
        status: 'Active',
        profileStatus: 'Draft',
        noticePeriodDays: data.noticePeriodDays || 30,
        epfApplicable: true,
        epfWageCeilingApplied: true,
        esiApplicable: false,
        ptApplicable: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    // 3. Encrypt sensitive fields at rest
    const encryptedPan = encryptField(data.panOrTaxNumber.toUpperCase());
    const encryptedAccount = encryptField(data.bankDetails.accountNumber);

    const updatedEmployee: EmployeeRecord = {
      ...targetEmployee,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      address: data.address.trim(),
      emergencyContact: data.emergencyContact,
      departmentId: data.departmentId,
      designationId: data.designationId,
      branchId: data.branchId,
      employmentType: data.employmentType,
      status: 'Active',
      profileStatus: 'Active', // Successfully enrolled!
      dateOfJoining: new Date(data.dateOfJoining),
      noticePeriodDays: data.noticePeriodDays || 30,
      shiftId: data.shiftId,
      bankDetails: {
        ...data.bankDetails,
        accountNumber: encryptedAccount!,
      },
      panOrTaxNumber: encryptedPan,
      pfUan: data.pfUan,
      esiNumber: data.esiNumber,
      baseSalaryAnnual: data.baseSalaryAnnual,
      salaryStructureId: data.salaryStructureId,
      updatedAt: now,
    };

    if (data.id) {
      await this.employeeRepo.update(data.id, updatedEmployee);
    } else {
      await this.employeeRepo.create(updatedEmployee);
    }

    // Publish enrollment finalized event
    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.enrolled',
        createEvent('EMPLOYEE_ENROLLED', updatedEmployee.id, 'Employee', {
          employeeId: updatedEmployee.id,
          userId: updatedEmployee.userId,
          status: 'Active',
          actorId: actor.id,
        })
      );
    }

    return this.redactSensitive(updatedEmployee, actor);
  }

  /**
   * Update Personal Details
   * Authorized for: HR Admin OR Self (if permission employee.profile.edit_personal present)
   */
  async updatePersonal(
    employeeId: string,
    patch: {
      personalEmail?: string;
      personalPhone?: string;
      currentAddress?: string;
      permanentAddress?: string;
      bloodGroup?: string;
      maritalStatus?: string;
      emergencyContact?: { name: string; relationship: string; phone: string };
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isSelf = actor.employeeId === employeeId;
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isHr && !isSelf) {
      throw new ForbiddenError('You can only update your own personal contact information');
    }

    const updated = await this.employeeRepo.update(employeeId, {
      personalEmail: patch.personalEmail?.toLowerCase().trim() || employee.personalEmail,
      personalPhone: patch.personalPhone?.trim() || employee.personalPhone,
      currentAddress: patch.currentAddress || employee.currentAddress,
      permanentAddress: patch.permanentAddress || employee.permanentAddress,
      bloodGroup: patch.bloodGroup || employee.bloodGroup,
      maritalStatus: patch.maritalStatus || employee.maritalStatus,
      emergencyContact: patch.emergencyContact || employee.emergencyContact,
    });

    return this.redactSensitive(updated, actor);
  }

  /**
   * Update Employment Details (Department, Designation, Branch, Status)
   * Authorized strictly for: HR Admin
   */
  async updateEmployment(
    employeeId: string,
    patch: {
      departmentId?: string;
      designationId?: string;
      branchId?: string;
      employmentType?: 'Permanent' | 'Contract' | 'Probation' | 'Intern';
      status?: 'Active' | 'On_Leave' | 'Probation' | 'Notice_Period' | 'Separated' | 'Inactive';
      profileStatus?: 'Draft' | 'Profile_Incomplete' | 'Pending_Verification' | 'Active' | 'Inactive' | 'Separated';
      noticePeriodDays?: number;
      probationPeriodDays?: number;
      confirmationDate?: string;
      dateOfSeparation?: string;
      separationReason?: string;
      shiftId?: string;
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can modify employment lifecycle details');
    }

    if (patch.departmentId) {
      const valid = await this.orgClient.validateDepartment(patch.departmentId);
      if (!valid) throw new ValidationError(`Department ${patch.departmentId} is invalid`);
    }
    if (patch.designationId) {
      const valid = await this.orgClient.validateDesignation(patch.designationId);
      if (!valid) throw new ValidationError(`Designation ${patch.designationId} is invalid`);
    }
    if (patch.branchId) {
      const valid = await this.orgClient.validateBranch(patch.branchId);
      if (!valid) throw new ValidationError(`Branch ${patch.branchId} is invalid`);
    }

    const updated = await this.employeeRepo.update(employeeId, {
      ...patch,
      confirmationDate: patch.confirmationDate ? new Date(patch.confirmationDate) : employee.confirmationDate,
      dateOfSeparation: patch.dateOfSeparation ? new Date(patch.dateOfSeparation) : employee.dateOfSeparation,
    });

    return this.redactSensitive(updated, actor);
  }

  /**
   * Update Reporting Hierarchy (Manager)
   * Authorized strictly for: HR Admin or Senior Manager
   */
  async updateReporting(
    employeeId: string,
    reportingManagerId: string,
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const canEdit =
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.SENIOR_MANAGER;

    if (!canEdit) {
      throw new ForbiddenError('Only HR Administrators or Senior Management can modify reporting lines');
    }

    // Prevent cyclical reporting to oneself
    if (reportingManagerId === employeeId) {
      throw new ValidationError('An employee cannot report to themselves');
    }

    const manager = await this.employeeRepo.findById(reportingManagerId);
    if (!manager) {
      throw new ValidationError(`Reporting manager ${reportingManagerId} does not exist`);
    }

    const updated = await this.employeeRepo.update(employeeId, { reportingManagerId });
    return this.redactSensitive(updated, actor);
  }

  /**
   * Update Salary & Bank Details
   * Strictly restricted to HR Admin. Self-modification or manager modification is prohibited.
   */
  async updateSalaryBank(
    employeeId: string,
    patch: {
      bankDetails?: { accountNumber: string; ifscCode: string; bankName: string; branchName?: string };
      panOrTaxNumber?: string;
      pfUan?: string;
      esiNumber?: string;
      baseSalaryAnnual?: number;
      salaryStructureId?: string;
      epfApplicable?: boolean;
      esiApplicable?: boolean;
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Modification of salary and banking details is strictly restricted to HR Administrators');
    }

    // Encrypt sensitive elements
    const updates: Partial<EmployeeRecord> = {
      pfUan: patch.pfUan !== undefined ? patch.pfUan : employee.pfUan,
      esiNumber: patch.esiNumber !== undefined ? patch.esiNumber : employee.esiNumber,
      baseSalaryAnnual: patch.baseSalaryAnnual !== undefined ? patch.baseSalaryAnnual : employee.baseSalaryAnnual,
      salaryStructureId: patch.salaryStructureId !== undefined ? patch.salaryStructureId : employee.salaryStructureId,
      epfApplicable: patch.epfApplicable !== undefined ? patch.epfApplicable : employee.epfApplicable,
      esiApplicable: patch.esiApplicable !== undefined ? patch.esiApplicable : employee.esiApplicable,
    };

    if (patch.panOrTaxNumber) {
      updates.panOrTaxNumber = encryptField(patch.panOrTaxNumber.toUpperCase());
    }

    if (patch.bankDetails) {
      updates.bankDetails = {
        ...patch.bankDetails,
        accountNumber: encryptField(patch.bankDetails.accountNumber)!,
      };
    }

    const updated = await this.employeeRepo.update(employeeId, updates);

    // Publish sensitive audit event
    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.salary_bank_updated',
        createEvent('EMPLOYEE_SALARY_BANK_UPDATED', employeeId, 'Employee', {
          employeeId,
          actorId: actor.id,
          actorRole: actor.role,
          changedFields: Object.keys(patch),
        })
      );
    }

    return this.redactSensitive(updated, actor);
  }

  /**
   * Get Employee by ID with RBAC scope redaction
   */
  async getById(id: string, actor: AuthenticatedUser): Promise<EmployeeRecord> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) throw new NotFoundError(`Employee ${id} not found`);

    // Verify scope access
    this.assertReadAccess(employee, actor);

    return this.redactSensitive(employee, actor);
  }

  /**
   * List Employees with scope filtering
   */
  async list(
    query: {
      departmentId?: string;
      branchId?: string;
      status?: string;
      profileStatus?: string;
      reportingManagerId?: string;
      page?: number;
      limit?: number;
    },
    actor: AuthenticatedUser
  ): Promise<{ employees: EmployeeRecord[]; total: number; page: number; limit: number }> {
    const isHrOrAdmin =
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.MANAGING_DIRECTOR;

    const isManager =
      actor.role === UserRole.REPORTING_MANAGER || actor.role === UserRole.SENIOR_MANAGER;

    let filter = { ...query };

    if (!isHrOrAdmin) {
      if (isManager && actor.employeeId) {
        // Scope to team direct reports
        filter = { ...filter, reportingManagerId: actor.employeeId };
      } else if (actor.employeeId) {
        // Scope solely to self
        const self = await this.employeeRepo.findById(actor.employeeId);
        return {
          employees: self ? [this.redactSensitive(self, actor)] : [],
          total: self ? 1 : 0,
          page: 1,
          limit: 50,
        };
      }
    }

    const { employees, total } = await this.employeeRepo.list(filter);
    const redacted = employees.map((e) => this.redactSensitive(e, actor));

    return {
      employees: redacted,
      total,
      page: query.page || 1,
      limit: query.limit || 50,
    };
  }

  /**
   * Asserts read permissions based on caller scope
   */
  private assertReadAccess(target: EmployeeRecord, actor: AuthenticatedUser): void {
    if (
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.MANAGING_DIRECTOR
    ) {
      return; // Enterprise-wide read access
    }

    if (actor.employeeId === target.id) {
      return; // Self access
    }

    if (
      (actor.role === UserRole.REPORTING_MANAGER || actor.role === UserRole.SENIOR_MANAGER) &&
      target.reportingManagerId === actor.employeeId
    ) {
      return; // Direct report access
    }

    throw new ForbiddenError('You do not have permission to view this employee record');
  }

  /**
   * Redacts sensitive financial and statutory fields according to caller's role
   */
  private redactSensitive(employee: EmployeeRecord, actor: AuthenticatedUser): EmployeeRecord {
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    const isSelf = actor.employeeId === employee.id;

    const decryptedPan = employee.panOrTaxNumber ? decryptField(employee.panOrTaxNumber) : undefined;
    const decryptedAccount = employee.bankDetails?.accountNumber
      ? decryptField(employee.bankDetails.accountNumber)
      : undefined;

    if (isHr) {
      // HR sees full details
      return {
        ...employee,
        panOrTaxNumber: decryptedPan,
        bankDetails: employee.bankDetails
          ? { ...employee.bankDetails, accountNumber: decryptedAccount || '***' }
          : undefined,
      };
    }

    if (isSelf) {
      // Employee sees their own salary & masked account
      return {
        ...employee,
        panOrTaxNumber: decryptedPan ? `******${decryptedPan.slice(-4)}` : undefined,
        bankDetails: employee.bankDetails
          ? {
              ...employee.bankDetails,
              accountNumber: decryptedAccount ? `******${decryptedAccount.slice(-4)}` : '******',
            }
          : undefined,
      };
    }

    // Managers and colleagues: Zero financial/statutory visibility
    const safeCopy: any = { ...employee };
    delete safeCopy.bankDetails;
    delete safeCopy.panOrTaxNumber;
    delete safeCopy.pfUan;
    delete safeCopy.esiNumber;
    delete safeCopy.baseSalaryAnnual;
    delete safeCopy.salaryStructureId;
    delete safeCopy.tdsRatePercent;

    return safeCopy;
  }
}

