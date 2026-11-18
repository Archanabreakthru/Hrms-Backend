import { PrismaClient } from '@prisma/client';
import { IEmployeeRepository, EmployeeRecord, ServiceRecordEntry } from './employeeRepository';

export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private prisma: PrismaClient) { }

  async findById(id: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { id } });
    return raw as any;
  }

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
    return raw as any;
  }

  async findByUserId(userId: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { userId } });
    return raw as any;
  }

  async findByPan(pan: string): Promise<EmployeeRecord | null> {
    // panOrTaxNumber is not a unique column in PostgreSQL employee.employees
    return null;
  }

  async list(filter?: {
    departmentId?: string;
    branchId?: string;
    status?: string;
    profileStatus?: string;
    reportingManagerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ employees: EmployeeRecord[]; total: number }> {
    const where: any = {};
    if (filter?.departmentId) where.departmentId = filter.departmentId;
    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.status) where.status = filter.status;
    if (filter?.profileStatus) where.profileStatus = filter.profileStatus;
    if (filter?.reportingManagerId) where.reportingManagerId = filter.reportingManagerId;

    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 50;
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);

    return { employees: employees as any, total };
  }

  async create(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const created = await this.prisma.employee.create({ data: employee as any });
    return created as any;
  }

  async createWithOutbox(employee: EmployeeRecord, outboxPayload: any): Promise<EmployeeRecord> {
    return this.prisma.$transaction(async (tx: any) => {
      const created = await tx.employee.create({ data: employee as any });
      await tx.provisioningOutbox.create({
        data: {
          employeeId: employee.id,
          email: employee.email.toLowerCase().trim(),
          payload: outboxPayload,
          status: 'PENDING',
          attempts: 0,
        },
      });
      return created as any;
    });
  }

  async update(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const updated = await this.prisma.employee.update({ where: { id }, data: updates as any });
    return updated as any;
  }

  async allocateNextId(designationCode: string): Promise<string> {
    const code = designationCode.toUpperCase().trim() || 'GEN';

    // Concurrency-safe atomic increment via PostgreSQL transaction with row-level lock
    const seq = await this.prisma.$transaction(async (tx: any) => {
      const record = await tx.employeeSequence.upsert({
        where: { prefix: code },
        create: { prefix: code, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      return record.lastNumber;
    });

    return `EMP-${code}-${String(seq).padStart(4, '0')}`;
  }

  async getDirectReports(managerId: string): Promise<EmployeeRecord[]> {
    const reports = await this.prisma.employee.findMany({ where: { reportingManagerId: managerId } });
    return reports as any;
  }

  async getServiceRecords(employeeId: string): Promise<ServiceRecordEntry[]> {
    const rows = await (this.prisma as any).$queryRawUnsafe(`
      SELECT 
        id::text,
        employee_id as "employeeId",
        record_type as "recordType",
        effective_date as "effectiveDate",
        previous_designation_id::text as "previousDesignationId",
        new_designation_id::text as "newDesignationId",
        previous_department_id::text as "previousDepartmentId",
        new_department_id::text as "newDepartmentId",
        previous_reporting_manager_id as "previousReportingManagerId",
        new_reporting_manager_id as "newReportingManagerId",
        previous_branch_id::text as "previousBranchId",
        new_branch_id::text as "newBranchId",
        previous_employment_type as "previousEmploymentType",
        new_employment_type as "newEmploymentType",
        previous_salary_amount::float as "previousSalaryAmount",
        new_salary_amount::float as "newSalaryAmount",
        notes,
        approval_status as "approvalStatus",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM employee.service_records
      WHERE employee_id = $1
      ORDER BY effective_date DESC, created_at DESC;
    `, employeeId);
    return rows;
  }

  async createServiceRecord(
    record: Omit<ServiceRecordEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceRecordEntry> {
    const rows = await (this.prisma as any).$queryRawUnsafe(`
      INSERT INTO employee.service_records (
        employee_id, record_type, effective_date,
        previous_designation_id, new_designation_id,
        previous_department_id, new_department_id,
        previous_reporting_manager_id, new_reporting_manager_id,
        previous_branch_id, new_branch_id,
        previous_employment_type, new_employment_type,
        previous_salary_amount, new_salary_amount,
        notes, approval_status, approved_by, approved_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3::date,
        $4::uuid, $5::uuid,
        $6::uuid, $7::uuid,
        $8, $9,
        $10::uuid, $11::uuid,
        $12, $13,
        $14, $15,
        $16, $17, $18, $19::timestamptz,
        NOW(), NOW()
      )
      RETURNING 
        id::text,
        employee_id as "employeeId",
        record_type as "recordType",
        effective_date as "effectiveDate",
        previous_designation_id::text as "previousDesignationId",
        new_designation_id::text as "newDesignationId",
        previous_department_id::text as "previousDepartmentId",
        new_department_id::text as "newDepartmentId",
        previous_reporting_manager_id as "previousReportingManagerId",
        new_reporting_manager_id as "newReportingManagerId",
        previous_branch_id::text as "previousBranchId",
        new_branch_id::text as "newBranchId",
        previous_employment_type as "previousEmploymentType",
        new_employment_type as "newEmploymentType",
        previous_salary_amount::float as "previousSalaryAmount",
        new_salary_amount::float as "newSalaryAmount",
        notes,
        approval_status as "approvalStatus",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `,
      record.employeeId,
      record.recordType,
      record.effectiveDate,
      record.previousDesignationId || null,
      record.newDesignationId || null,
      record.previousDepartmentId || null,
      record.newDepartmentId || null,
      record.previousReportingManagerId || null,
      record.newReportingManagerId || null,
      record.previousBranchId || null,
      record.newBranchId || null,
      record.previousEmploymentType || null,
      record.newEmploymentType || null,
      record.previousSalaryAmount || null,
      record.newSalaryAmount || null,
      record.notes || null,
      record.approvalStatus || 'Approved',
      record.approvedBy || null,
      record.approvedAt || (record.approvalStatus === 'Approved' ? new Date().toISOString() : null)
    );
    return rows[0];
  }

  async updateServiceRecordStatus(
    recordId: string,
    status: string,
    approvedBy?: string
  ): Promise<ServiceRecordEntry> {
    const rows = await (this.prisma as any).$queryRawUnsafe(`
      UPDATE employee.service_records
      SET 
        approval_status = $2,
        approved_by = COALESCE($3, approved_by),
        approved_at = CASE WHEN $2 = 'Approved' THEN NOW() ELSE approved_at END,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING 
        id::text,
        employee_id as "employeeId",
        record_type as "recordType",
        effective_date as "effectiveDate",
        previous_designation_id::text as "previousDesignationId",
        new_designation_id::text as "newDesignationId",
        previous_department_id::text as "previousDepartmentId",
        new_department_id::text as "newDepartmentId",
        previous_reporting_manager_id as "previousReportingManagerId",
        new_reporting_manager_id as "newReportingManagerId",
        previous_branch_id::text as "previousBranchId",
        new_branch_id::text as "newBranchId",
        previous_employment_type as "previousEmploymentType",
        new_employment_type as "newEmploymentType",
        previous_salary_amount::float as "previousSalaryAmount",
        new_salary_amount::float as "newSalaryAmount",
        notes,
        approval_status as "approvalStatus",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `, recordId, status, approvedBy || null);

    if (!rows || rows.length === 0) {
      throw new Error(`Service record ${recordId} not found`);
    }
    return rows[0];
  }
}

