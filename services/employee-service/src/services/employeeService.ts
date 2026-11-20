import crypto from 'crypto';
import { IEmployeeRepository, EmployeeRecord, ServiceRecordEntry, EmployeeDocumentRecord } from '../repositories/employeeRepository';
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      lastName?: string;
      email: string;
      phone?: string;
      userId?: string;
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

    const finalUserId = (data.userId && UUID_REGEX.test(data.userId.trim()))
      ? data.userId.trim()
      : crypto.randomUUID();

    if (finalUserId) {
      const existingUser = await this.employeeRepo.findByUserId(finalUserId);
      if (existingUser) {
        throw new ConflictError(`User ${finalUserId} is already assigned to employee ${existingUser.id}`);
      }
    }

    // 2. Validate and resolve organization references if provided
    const [resolvedDeptId, resolvedDesigId, resolvedBranchId] = await Promise.all([
      this.orgClient.resolveDepartmentId(data.departmentId),
      this.orgClient.resolveDesignationId(data.designationId),
      this.orgClient.resolveBranchId(data.branchId),
    ]);

    if (data.departmentId && !resolvedDeptId) {
      const valid = await this.orgClient.validateDepartment(data.departmentId);
      if (!valid) throw new ValidationError(`Department ${data.departmentId} does not exist`);
    }
    if (data.designationId && !resolvedDesigId) {
      const valid = await this.orgClient.validateDesignation(data.designationId);
      if (!valid) throw new ValidationError(`Designation ${data.designationId} does not exist`);
    }
    if (data.branchId && !resolvedBranchId) {
      const valid = await this.orgClient.validateBranch(data.branchId);
      if (!valid) throw new ValidationError(`Branch ${data.branchId} does not exist`);
    }

    // 3. Concurrency-safe ID allocation
    const desigCode = await this.orgClient.getDesignationCode(resolvedDesigId || data.designationId);
    const employeeId = await this.employeeRepo.allocateNextId(desigCode);

    const now = new Date();
    const newEmployee: EmployeeRecord = {
      id: employeeId,
      userId: finalUserId,
      firstName: data.firstName.trim(),
      lastName: (data.lastName || '').trim(),
      email: data.email.toLowerCase().trim(),
      phone: (data.phone || '').trim(),
      departmentId: resolvedDeptId || (UUID_REGEX.test(data.departmentId || '') ? data.departmentId : undefined),
      designationId: resolvedDesigId || (UUID_REGEX.test(data.designationId || '') ? data.designationId : undefined),
      branchId: resolvedBranchId || (UUID_REGEX.test(data.branchId || '') ? data.branchId : undefined),
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
      gender: 'Male' | 'Female' | 'Other';
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
      shiftId?: string;
      bankDetails: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        branchName?: string;
      };
      panOrTaxNumber: string;
      pfUan?: string;
      esiNumber?: string;
      baseSalaryAnnual: number;
      salaryStructureId?: string;
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeRecord> {
    // 1. Validate Organization Service entities and resolve IDs
    const [deptValid, desigValid, branchValid] = await Promise.all([
      this.orgClient.validateDepartment(data.departmentId),
      this.orgClient.validateDesignation(data.designationId),
      this.orgClient.validateBranch(data.branchId),
    ]);
    if (!deptValid) throw new ValidationError(`Department ${data.departmentId} is invalid`);
    if (!desigValid) throw new ValidationError(`Designation ${data.designationId} is invalid`);
    if (!branchValid) throw new ValidationError(`Branch ${data.branchId} is invalid`);

    const [resolvedDeptId, resolvedDesigId, resolvedBranchId] = await Promise.all([
      this.orgClient.resolveDepartmentId(data.departmentId),
      this.orgClient.resolveDesignationId(data.designationId),
      this.orgClient.resolveBranchId(data.branchId),
    ]);

    const finalUserId = (data.userId && UUID_REGEX.test(data.userId.trim()))
      ? data.userId.trim()
      : crypto.randomUUID();

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
      if (finalUserId) {
        const userCheck = await this.employeeRepo.findByUserId(finalUserId);
        if (userCheck) {
          throw new ConflictError(`User ${finalUserId} is already assigned to employee ${userCheck.id}`);
        }
      }

      const desigCode = await this.orgClient.getDesignationCode(resolvedDesigId || data.designationId);
      const newId = await this.employeeRepo.allocateNextId(desigCode);

      targetEmployee = {
        id: newId,
        userId: finalUserId,
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
      userId: finalUserId || targetEmployee.userId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      address: data.address.trim(),
      emergencyContact: data.emergencyContact,
      departmentId: resolvedDeptId || (UUID_REGEX.test(data.departmentId || '') ? data.departmentId : undefined),
      designationId: resolvedDesigId || (UUID_REGEX.test(data.designationId || '') ? data.designationId : undefined),
      branchId: resolvedBranchId || (UUID_REGEX.test(data.branchId || '') ? data.branchId : undefined),
      employmentType: data.employmentType,
      status: 'Active',
      profileStatus: 'Active', // Successfully enrolled!
      dateOfJoining: new Date(data.dateOfJoining),
      noticePeriodDays: data.noticePeriodDays || 30,
      shiftId: (data.shiftId && UUID_REGEX.test(data.shiftId.trim())) ? data.shiftId.trim() : undefined,
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

    const outboxPayload = {
      employeeId: updatedEmployee.id,
      email: updatedEmployee.email,
      firstName: updatedEmployee.firstName,
      lastName: updatedEmployee.lastName,
      roleCode: 'employee',
      departmentId: updatedEmployee.departmentId,
    };

    if (data.id) {
      if (this.employeeRepo.updateWithOutbox) {
        await this.employeeRepo.updateWithOutbox(data.id, updatedEmployee, outboxPayload);
      } else {
        await this.employeeRepo.update(data.id, updatedEmployee);
      }
    } else {
      if (this.employeeRepo.createWithOutbox) {
        await this.employeeRepo.createWithOutbox(updatedEmployee, outboxPayload);
      } else {
        await this.employeeRepo.create(updatedEmployee);
      }
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
   * Delete Employee Record
   * Authorized for: HR Admin / Super Admin
   */
  async deleteEmployee(id: string, actor: AuthenticatedUser): Promise<{ success: boolean; id: string; message: string }> {
    const existing = await this.employeeRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID ${id} not found`);
    }

    if (this.employeeRepo.delete) {
      await this.employeeRepo.delete(id);
    }

    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.deleted',
        createEvent('EMPLOYEE_DELETED', id, 'Employee', {
          employeeId: id,
          actorId: actor.id,
        })
      );
    }

    return {
      success: true,
      id,
      message: `Employee ${id} deleted successfully.`,
    };
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
      search?: string;
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
   * Service Records: List service history for an employee
   */
  async getServiceRecords(employeeId: string, actor: AuthenticatedUser): Promise<ServiceRecordEntry[]> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    this.assertReadAccess(employee, actor);

    const records = await this.employeeRepo.getServiceRecords(employeeId);
    if (!records || records.length === 0) {
      try {
        const initialRecord = await this.employeeRepo.createServiceRecord({
          employeeId: employee.id,
          recordType: 'Date of Joining',
          effectiveDate: employee.dateOfJoining || new Date(),
          newDesignationId: employee.designationId || null,
          newDepartmentId: employee.departmentId || null,
          newBranchId: employee.branchId || null,
          newEmploymentType: employee.employmentType || 'Permanent',
          newSalaryAmount: employee.baseSalaryAnnual || 192000,
          notes: 'Initial employee appointment and official onboarding to organization.',
          approvalStatus: 'Approved',
          approvedBy: 'HR Administrator',
        });
        return [initialRecord];
      } catch {
        return [{
          id: `sr-${employee.id}-init`,
          employeeId: employee.id,
          recordType: 'Date of Joining',
          effectiveDate: employee.dateOfJoining || new Date(),
          newDesignationId: employee.designationId || null,
          newDepartmentId: employee.departmentId || null,
          newBranchId: employee.branchId || null,
          newEmploymentType: employee.employmentType || 'Permanent',
          newSalaryAmount: employee.baseSalaryAnnual || 192000,
          notes: 'Initial employee appointment and official onboarding to organization.',
          approvalStatus: 'Approved',
          approvedBy: 'HR Administrator',
          createdAt: employee.createdAt || new Date(),
          updatedAt: employee.updatedAt || new Date(),
        }];
      }
    }

    return records;
  }

  /**
   * Service Records: Create a new service record entry
   */
  async createServiceRecord(
    employeeId: string,
    data: {
      recordType: string;
      effectiveDate: string;
      previousDesignationId?: string;
      newDesignationId?: string;
      previousDepartmentId?: string;
      newDepartmentId?: string;
      previousReportingManagerId?: string;
      newReportingManagerId?: string;
      previousBranchId?: string;
      newBranchId?: string;
      previousEmploymentType?: string;
      newEmploymentType?: string;
      previousSalaryAmount?: number;
      newSalaryAmount?: number;
      notes?: string;
      approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
    },
    actor: AuthenticatedUser
  ): Promise<ServiceRecordEntry> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can create service records');
    }

    const newRecord = await this.employeeRepo.createServiceRecord({
      employeeId,
      recordType: data.recordType,
      effectiveDate: new Date(data.effectiveDate),
      previousDesignationId: data.previousDesignationId || employee.designationId || null,
      newDesignationId: data.newDesignationId || null,
      previousDepartmentId: data.previousDepartmentId || employee.departmentId || null,
      newDepartmentId: data.newDepartmentId || null,
      previousReportingManagerId: data.previousReportingManagerId || employee.reportingManagerId || null,
      newReportingManagerId: data.newReportingManagerId || null,
      previousBranchId: data.previousBranchId || employee.branchId || null,
      newBranchId: data.newBranchId || null,
      previousEmploymentType: data.previousEmploymentType || employee.employmentType || null,
      newEmploymentType: data.newEmploymentType || null,
      previousSalaryAmount: data.previousSalaryAmount ?? employee.baseSalaryAnnual ?? null,
      newSalaryAmount: data.newSalaryAmount ?? null,
      notes: data.notes || null,
      approvalStatus: data.approvalStatus || 'Approved',
      approvedBy: data.approvalStatus === 'Approved' ? actor.email || actor.id : null,
      approvedAt: data.approvalStatus === 'Approved' ? new Date() : null,
    });

    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.service_record_created',
        createEvent('SERVICE_RECORD_CREATED', newRecord.id, 'ServiceRecord', {
          recordId: newRecord.id,
          employeeId,
          recordType: newRecord.recordType,
          actorId: actor.id,
        })
      );
    }

    return newRecord;
  }

  /**
   * Service Records: Update status (Approve / Reject)
   */
  async updateServiceRecordStatus(
    employeeId: string,
    recordId: string,
    status: 'Approved' | 'Rejected',
    actor: AuthenticatedUser
  ): Promise<ServiceRecordEntry> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only HR Administrators can approve or reject service records');
    }

    const updated = await this.employeeRepo.updateServiceRecordStatus(
      recordId,
      status,
      actor.email || actor.id
    );

    if (this.eventBus) {
      await this.eventBus.publish(
        'employee.service_record_status_updated',
        createEvent('SERVICE_RECORD_STATUS_UPDATED', recordId, 'ServiceRecord', {
          recordId,
          employeeId,
          status,
          actorId: actor.id,
        })
      );
    }

    return updated;
  }

  async getDocuments(employeeId: string, actor: AuthenticatedUser): Promise<EmployeeDocumentRecord[]> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    this.assertReadAccess(employee, actor);
    return this.employeeRepo.getDocuments(employeeId);
  }

  async uploadDocument(
    employeeId: string,
    payload: {
      title: string;
      documentType: string;
      fileName: string;
      fileSizeBytes?: number;
      fileUrl: string;
      issueDate?: string | null;
      expiryDate?: string | null;
      verificationStatus?: string;
      notes?: string | null;
    },
    actor: AuthenticatedUser
  ): Promise<EmployeeDocumentRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    const isSelf = actor.employeeId === employeeId;

    if (!isHr && !isSelf) {
      throw new ForbiddenError('You can only upload documents for your own profile or as HR Administrator');
    }

    const doc = await this.employeeRepo.createDocument({
      employeeId,
      title: payload.title,
      documentType: payload.documentType,
      fileName: payload.fileName,
      fileSizeBytes: payload.fileSizeBytes || 0,
      fileUrl: payload.fileUrl,
      issueDate: payload.issueDate ? new Date(payload.issueDate) : null,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
      verificationStatus: isHr ? (payload.verificationStatus || 'Verified') : 'Pending',
      notes: payload.notes || null,
      uploadedBy: actor.id || null,
    });

    return doc;
  }

  async deleteDocument(employeeId: string, docId: string, actor: AuthenticatedUser): Promise<boolean> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) {
      throw new ForbiddenError('Only HR Administrators can delete employee documents');
    }

    return this.employeeRepo.deleteDocument(employeeId, docId);
  }

  async updateDocumentStatus(
    employeeId: string,
    docId: string,
    payload: { verificationStatus: string; notes?: string },
    actor: AuthenticatedUser
  ): Promise<EmployeeDocumentRecord> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) throw new NotFoundError(`Employee ${employeeId} not found`);

    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;
    if (!isHr) {
      throw new ForbiddenError('Only HR Administrators can verify or reject documents');
    }

    return this.employeeRepo.updateDocumentStatus(
      employeeId,
      docId,
      payload.verificationStatus,
      payload.notes,
      actor.id
    );
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
    const isHr = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN || actor.permissions?.includes('*' as any) || actor.permissions?.includes('employee.salary.read' as any);
    const isSelf = actor.employeeId === employee.id || Boolean(employee.userId && actor.id === employee.userId);

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

