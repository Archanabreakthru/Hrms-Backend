import { PrismaClient } from '../generated/client';
import { IEmployeeRepository, EmployeeRecord, ServiceRecordEntry, EmployeeDocumentRecord } from './employeeRepository';

export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private prisma: PrismaClient) { }

  async findById(id: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { id } });
    if (!raw) return null;
    try {
      const [bankRows, statRows, srvRows, empExtra]: [any[], any[], any[], any[]] = await Promise.all([
        (this.prisma as any).$queryRawUnsafe('SELECT * FROM employee.employee_bank_details WHERE employee_id = $1 LIMIT 1', id).catch(() => []),
        (this.prisma as any).$queryRawUnsafe('SELECT * FROM employee.employee_statutory_details WHERE employee_id = $1 LIMIT 1', id).catch(() => []),
        (this.prisma as any).$queryRawUnsafe('SELECT new_salary_amount FROM employee.service_records WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC LIMIT 1', id).catch(() => []),
        (this.prisma as any).$queryRawUnsafe('SELECT base_salary_annual, salary_structure_id FROM employee.employees WHERE id = $1 LIMIT 1', id).catch(() => []),
      ]);
      const salary = (empExtra[0]?.base_salary_annual !== null && empExtra[0]?.base_salary_annual !== undefined)
        ? Number(empExtra[0].base_salary_annual)
        : (srvRows[0]?.new_salary_amount ? Number(srvRows[0].new_salary_amount) : undefined);
      const salaryStructureId = empExtra[0]?.salary_structure_id || undefined;
      return this.enrichEmployeeRecord(raw, bankRows[0], statRows[0], salary, salaryStructureId);
    } catch {
      return this.enrichEmployeeRecord(raw);
    }
  }

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!raw) return null;
    return this.findById(raw.id);
  }

  async findByUserId(userId: string): Promise<EmployeeRecord | null> {
    const raw = await this.prisma.employee.findUnique({ where: { userId } });
    if (!raw) return null;
    return this.findById(raw.id);
  }

  async findByPan(pan: string): Promise<EmployeeRecord | null> {
    if (!pan || !pan.trim()) return null;
    try {
      const rows: any[] = await (this.prisma as any).$queryRawUnsafe(
        'SELECT employee_id FROM employee.employee_statutory_details WHERE pan_number = $1 LIMIT 1',
        pan.toUpperCase().trim()
      );
      if (rows && rows.length > 0) {
        return this.findById(rows[0].employee_id);
      }
    } catch {
      // Ignored
    }
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

    const empIds = employees.map((e) => e.id);
    let bankMap: Record<string, any> = {};
    let statMap: Record<string, any> = {};
    let salaryMap: Record<string, number> = {};
    let structureMap: Record<string, string> = {};

    if (empIds.length > 0) {
      try {
        const placeholders = empIds.map((_, i) => `$${i + 1}`).join(',');
        const [banks, stats, srvs, empExtras]: [any[], any[], any[], any[]] = await Promise.all([
          (this.prisma as any).$queryRawUnsafe(`SELECT * FROM employee.employee_bank_details WHERE employee_id IN (${placeholders})`, ...empIds).catch(() => []),
          (this.prisma as any).$queryRawUnsafe(`SELECT * FROM employee.employee_statutory_details WHERE employee_id IN (${placeholders})`, ...empIds).catch(() => []),
          (this.prisma as any).$queryRawUnsafe(`SELECT DISTINCT ON (employee_id) employee_id, new_salary_amount FROM employee.service_records WHERE employee_id IN (${placeholders}) ORDER BY employee_id, effective_date DESC, created_at DESC`, ...empIds).catch(() => []),
          (this.prisma as any).$queryRawUnsafe(`SELECT id, base_salary_annual, salary_structure_id FROM employee.employees WHERE id IN (${placeholders})`, ...empIds).catch(() => []),
        ]);
        if (Array.isArray(banks)) banks.forEach((b) => { bankMap[b.employee_id] = b; });
        if (Array.isArray(stats)) stats.forEach((s) => { statMap[s.employee_id] = s; });
        if (Array.isArray(srvs)) srvs.forEach((sr) => { if (sr.new_salary_amount) salaryMap[sr.employee_id] = Number(sr.new_salary_amount); });
        if (Array.isArray(empExtras)) empExtras.forEach((extra) => {
          if (extra.base_salary_annual !== null && extra.base_salary_annual !== undefined) {
            salaryMap[extra.id] = Number(extra.base_salary_annual);
          }
          if (extra.salary_structure_id) {
            structureMap[extra.id] = extra.salary_structure_id;
          }
        });
      } catch {
        // Fallback gracefully
      }
    }

    const enrichedEmployees = employees.map((e) =>
      this.enrichEmployeeRecord(e, bankMap[e.id], statMap[e.id], salaryMap[e.id], structureMap[e.id])
    );

    return { employees: enrichedEmployees, total };
  }

  private enrichEmployeeRecord(raw: any, bankRow?: any, statRow?: any, salary?: number, salaryStructureId?: string): EmployeeRecord {
    if (!raw) return raw;
    const enriched: any = {
      ...raw,
      officialEmail: raw.email,
      officialPhone: raw.phone,
      emergencyContact: {
        name: raw.emergencyContactName || raw.emergencyContact?.name || '',
        relationship: raw.emergencyContactRelationship || raw.emergencyContact?.relationship || '',
        phone: raw.emergencyContactPhone || raw.emergencyContact?.phone || '',
      },
      bankDetails: bankRow ? {
        bankName: bankRow.bank_name || '',
        accountNumber: bankRow.account_number || '',
        ifscCode: bankRow.ifsc_code || '',
        ifscOrRouting: bankRow.ifsc_code || '',
        branchName: bankRow.branch_name || '',
      } : (raw.bankDetails || undefined),
      panOrTaxNumber: statRow?.pan_number || raw.panOrTaxNumber || undefined,
      pfUan: statRow?.pf_uan || raw.pfUan || undefined,
      esiNumber: statRow?.esi_number || raw.esiNumber || undefined,
      epfApplicable: statRow?.epf_applicable ?? raw.epfApplicable ?? true,
      epfWageCeilingApplied: statRow?.epf_wage_ceiling_applied ?? raw.epfWageCeilingApplied ?? true,
      esiApplicable: statRow?.esi_applicable ?? raw.esiApplicable ?? false,
      ptApplicable: statRow?.pt_applicable ?? raw.ptApplicable ?? true,
      baseSalaryAnnual: salary !== undefined ? salary : (raw.baseSalaryAnnual || 0),
      salaryStructureId: salaryStructureId || raw.salaryStructureId || undefined,
    };
    return enriched;
  }

  private async syncBankAndStatutory(employeeId: string, employee: Partial<EmployeeRecord>): Promise<void> {
    try {
      if (employee.bankDetails && (employee.bankDetails.accountNumber || employee.bankDetails.bankName)) {
        let holderName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        if (!holderName) {
          const empRow: any[] = await (this.prisma as any).$queryRawUnsafe(
            'SELECT first_name, last_name FROM employee.employees WHERE id = $1 LIMIT 1',
            employeeId
          ).catch(() => []);
          if (empRow && empRow.length > 0) {
            holderName = `${empRow[0].first_name || ''} ${empRow[0].last_name || ''}`.trim();
          }
        }
        if (!holderName) holderName = 'Primary Account';

        const ifsc = (employee.bankDetails.ifscCode || (employee.bankDetails as any).ifscOrRouting || '').trim();

        await (this.prisma as any).$queryRawUnsafe(
          `INSERT INTO employee.employee_bank_details (
            id, employee_id, bank_name, account_holder_name, account_number, ifsc_code, branch_name, is_primary, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW()
          )
          ON CONFLICT (employee_id) DO UPDATE SET
            bank_name = EXCLUDED.bank_name,
            account_holder_name = EXCLUDED.account_holder_name,
            account_number = EXCLUDED.account_number,
            ifsc_code = EXCLUDED.ifsc_code,
            branch_name = EXCLUDED.branch_name,
            is_primary = true,
            updated_at = NOW()`,
          employeeId,
          employee.bankDetails.bankName || 'HDFC Bank',
          holderName,
          employee.bankDetails.accountNumber || '',
          ifsc,
          employee.bankDetails.branchName || null
        );
      }
    } catch (e) {
      console.warn('syncBankAndStatutory (bank) error:', e);
    }

    try {
      if (
        employee.panOrTaxNumber !== undefined ||
        employee.pfUan !== undefined ||
        employee.esiNumber !== undefined ||
        employee.epfApplicable !== undefined ||
        employee.ptApplicable !== undefined
      ) {
        await (this.prisma as any).$queryRawUnsafe(
          `INSERT INTO employee.employee_statutory_details (
            id, employee_id, pan_number, pf_uan, esi_number, epf_applicable, epf_wage_ceiling_applied, esi_applicable, pt_applicable, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          )
          ON CONFLICT (employee_id) DO UPDATE SET
            pan_number = COALESCE(EXCLUDED.pan_number, employee.employee_statutory_details.pan_number),
            pf_uan = COALESCE(EXCLUDED.pf_uan, employee.employee_statutory_details.pf_uan),
            esi_number = COALESCE(EXCLUDED.esi_number, employee.employee_statutory_details.esi_number),
            epf_applicable = EXCLUDED.epf_applicable,
            epf_wage_ceiling_applied = EXCLUDED.epf_wage_ceiling_applied,
            esi_applicable = EXCLUDED.esi_applicable,
            pt_applicable = EXCLUDED.pt_applicable,
            updated_at = NOW()`,
          employeeId,
          employee.panOrTaxNumber || null,
          employee.pfUan || null,
          employee.esiNumber || null,
          employee.epfApplicable ?? true,
          employee.epfWageCeilingApplied ?? true,
          employee.esiApplicable ?? false,
          employee.ptApplicable ?? true
        );
      }
    } catch (e) {
      console.warn('syncBankAndStatutory (statutory) error:', e);
    }
  }

  private async syncSalary(employeeId: string, employee: Partial<EmployeeRecord>): Promise<void> {
    try {
      const salary = employee.baseSalaryAnnual !== undefined ? Number(employee.baseSalaryAnnual) : undefined;
      const structureId = employee.salaryStructureId !== undefined ? employee.salaryStructureId : undefined;

      if (salary !== undefined || structureId !== undefined) {
        // 1. Update employee.employees table directly in DB
        await (this.prisma as any).$queryRawUnsafe(
          `UPDATE employee.employees 
           SET 
             base_salary_annual = COALESCE($2, base_salary_annual),
             salary_structure_id = COALESCE($3, salary_structure_id),
             updated_at = NOW()
           WHERE id = $1`,
          employeeId,
          salary !== undefined && !isNaN(salary) ? salary : null,
          structureId !== undefined ? structureId : null
        );

        // 2. Also ensure service_records reflects salary history
        if (salary !== undefined && !isNaN(salary)) {
          const srvRows: any[] = await (this.prisma as any).$queryRawUnsafe(
            'SELECT new_salary_amount FROM employee.service_records WHERE employee_id = $1 ORDER BY effective_date DESC, created_at DESC LIMIT 1',
            employeeId
          ).catch(() => []);

          const currentSalaryInSrv = (srvRows && srvRows[0]?.new_salary_amount !== undefined && srvRows[0]?.new_salary_amount !== null)
            ? Number(srvRows[0].new_salary_amount)
            : undefined;

          if (currentSalaryInSrv === undefined) {
            // No service record yet - create initial Date of Joining record with new_salary_amount
            await (this.prisma as any).$queryRawUnsafe(
              `INSERT INTO employee.service_records (
                id, employee_id, record_type, effective_date, new_salary_amount,
                notes, approval_status, approved_by, approved_at, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, 'Date of Joining', CURRENT_DATE, $2,
                'Initial salary assignment on onboarding', 'Approved', 'HR Administrator', NOW(), NOW(), NOW()
              )`,
              employeeId,
              salary
            ).catch((e: any) => console.warn('syncSalary initial service_record error:', e));
          } else if (currentSalaryInSrv !== salary) {
            // Salary changed - record revision in service history
            await (this.prisma as any).$queryRawUnsafe(
              `INSERT INTO employee.service_records (
                id, employee_id, record_type, effective_date, previous_salary_amount, new_salary_amount,
                notes, approval_status, approved_by, approved_at, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, 'Salary Revision', CURRENT_DATE, $2, $3,
                'Annual compensation structure update', 'Approved', 'HR Administrator', NOW(), NOW(), NOW()
              )`,
              employeeId,
              currentSalaryInSrv,
              salary
            ).catch((e: any) => console.warn('syncSalary revision service_record error:', e));
          }
        }
      }
    } catch (e) {
      console.warn('syncSalary error:', e);
    }
  }

  private sanitizeForCreate(raw: any): any {
    if (!raw) return {};

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const toUuid = (v?: string | null) => (v && UUID_REGEX.test(v.trim()) ? v.trim() : null);
    const toDate = (v?: any) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const data: any = {
      id: raw.id,
      originalLegacyId: raw.originalLegacyId || null,
      userId: toUuid(raw.userId),
      firstName: raw.firstName ? String(raw.firstName).trim() : 'Employee',
      lastName: raw.lastName !== undefined ? String(raw.lastName).trim() : '',
      email: (raw.email || raw.officialEmail || '').toLowerCase().trim(),
      phone: (raw.phone || raw.officialPhone || 'Pending').trim(),
      personalEmail: raw.personalEmail ? String(raw.personalEmail).toLowerCase().trim() : null,
      personalPhone: raw.personalPhone ? String(raw.personalPhone).trim() : (raw.personalMobile ? String(raw.personalMobile).trim() : null),
      avatarUrl: raw.avatarUrl || null,
      dateOfBirth: toDate(raw.dateOfBirth),
      gender: raw.gender || null,
      bloodGroup: raw.bloodGroup ? String(raw.bloodGroup).trim() : null,
      maritalStatus: raw.maritalStatus ? String(raw.maritalStatus).trim() : null,
      currentAddress: raw.currentAddress || raw.address || null,
      permanentAddress: raw.permanentAddress || raw.address || null,
      emergencyContactName: raw.emergencyContactName || raw.emergencyContact?.name || null,
      emergencyContactRelationship: raw.emergencyContactRelationship || raw.emergencyContact?.relationship || null,
      emergencyContactPhone: raw.emergencyContactPhone || raw.emergencyContact?.phone || null,
      departmentId: toUuid(raw.departmentId),
      designationId: toUuid(raw.designationId),
      branchId: toUuid(raw.branchId),
      shiftId: (raw.shiftId && UUID_REGEX.test(String(raw.shiftId).trim())) ? String(raw.shiftId).trim() : null,
      reportingManagerId: raw.reportingManagerId || null,
      employmentType: raw.employmentType || 'Permanent',
      employeeCategory: raw.employeeCategory || 'Core Staff',
      status: raw.status || 'Active',
      profileStatus: raw.profileStatus || 'Active',
      dateOfJoining: toDate(raw.dateOfJoining) || new Date(),
      confirmationDate: toDate(raw.confirmationDate),
      probationPeriodDays: typeof raw.probationPeriodDays === 'number' ? raw.probationPeriodDays : 180,
      noticePeriodDays: typeof raw.noticePeriodDays === 'number' ? raw.noticePeriodDays : 60,
      dateOfSeparation: toDate(raw.dateOfSeparation),
      separationReason: raw.separationReason || null,
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    };

    // Filter undefined values so updates only touch specified fields
    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    return data;
  }

  private sanitizeForUpdate(raw: any): any {
    if (!raw) return {};

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const toUuid = (v?: string | null) => (v && UUID_REGEX.test(v.trim()) ? v.trim() : null);
    const toDate = (v?: any) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const data: any = {};

    if (raw.originalLegacyId !== undefined) data.originalLegacyId = raw.originalLegacyId || null;
    if (raw.userId !== undefined) data.userId = toUuid(raw.userId);
    if (raw.firstName !== undefined && String(raw.firstName).trim()) data.firstName = String(raw.firstName).trim();
    if (raw.lastName !== undefined) data.lastName = String(raw.lastName).trim();
    if (raw.email !== undefined && String(raw.email).trim()) data.email = String(raw.email).toLowerCase().trim();
    else if (raw.officialEmail !== undefined && String(raw.officialEmail).trim()) data.email = String(raw.officialEmail).toLowerCase().trim();
    if (raw.phone !== undefined && String(raw.phone).trim()) data.phone = String(raw.phone).trim();
    else if (raw.officialPhone !== undefined && String(raw.officialPhone).trim()) data.phone = String(raw.officialPhone).trim();

    if (raw.personalEmail !== undefined) data.personalEmail = raw.personalEmail ? String(raw.personalEmail).toLowerCase().trim() : null;
    if (raw.personalPhone !== undefined) data.personalPhone = raw.personalPhone ? String(raw.personalPhone).trim() : null;
    else if (raw.personalMobile !== undefined) data.personalPhone = raw.personalMobile ? String(raw.personalMobile).trim() : null;

    if (raw.avatarUrl !== undefined) data.avatarUrl = raw.avatarUrl || null;
    if (raw.dateOfBirth !== undefined) data.dateOfBirth = toDate(raw.dateOfBirth);
    if (raw.gender !== undefined) data.gender = raw.gender || null;
    if (raw.bloodGroup !== undefined) data.bloodGroup = raw.bloodGroup ? String(raw.bloodGroup).trim() : null;
    if (raw.maritalStatus !== undefined) data.maritalStatus = raw.maritalStatus ? String(raw.maritalStatus).trim() : null;

    if (raw.currentAddress !== undefined) data.currentAddress = raw.currentAddress || null;
    if (raw.permanentAddress !== undefined) data.permanentAddress = raw.permanentAddress || null;
    if (raw.address !== undefined) {
      if (data.currentAddress === undefined) data.currentAddress = raw.address || null;
      if (data.permanentAddress === undefined) data.permanentAddress = raw.address || null;
    }

    if (raw.emergencyContactName !== undefined) data.emergencyContactName = raw.emergencyContactName || null;
    else if (raw.emergencyContact?.name !== undefined) data.emergencyContactName = raw.emergencyContact.name || null;

    if (raw.emergencyContactRelationship !== undefined) data.emergencyContactRelationship = raw.emergencyContactRelationship || null;
    else if (raw.emergencyContact?.relationship !== undefined) data.emergencyContactRelationship = raw.emergencyContact.relationship || null;

    if (raw.emergencyContactPhone !== undefined) data.emergencyContactPhone = raw.emergencyContactPhone || null;
    else if (raw.emergencyContact?.phone !== undefined) data.emergencyContactPhone = raw.emergencyContact.phone || null;

    if (raw.departmentId !== undefined) data.departmentId = toUuid(raw.departmentId);
    if (raw.designationId !== undefined) data.designationId = toUuid(raw.designationId);
    if (raw.branchId !== undefined) data.branchId = toUuid(raw.branchId);
    if (raw.shiftId !== undefined) data.shiftId = toUuid(raw.shiftId);
    if (raw.reportingManagerId !== undefined) data.reportingManagerId = raw.reportingManagerId || null;

    if (raw.employmentType !== undefined) data.employmentType = raw.employmentType;
    if (raw.employeeCategory !== undefined) data.employeeCategory = raw.employeeCategory;
    if (raw.status !== undefined) data.status = raw.status;
    if (raw.profileStatus !== undefined) data.profileStatus = raw.profileStatus;

    if (raw.dateOfJoining !== undefined) data.dateOfJoining = toDate(raw.dateOfJoining);
    if (raw.confirmationDate !== undefined) data.confirmationDate = toDate(raw.confirmationDate);
    if (raw.probationPeriodDays !== undefined) data.probationPeriodDays = typeof raw.probationPeriodDays === 'number' ? raw.probationPeriodDays : null;
    if (raw.noticePeriodDays !== undefined) data.noticePeriodDays = typeof raw.noticePeriodDays === 'number' ? raw.noticePeriodDays : null;
    if (raw.dateOfSeparation !== undefined) data.dateOfSeparation = toDate(raw.dateOfSeparation);
    if (raw.separationReason !== undefined) data.separationReason = raw.separationReason || null;
    if (raw.isActive !== undefined) data.isActive = Boolean(raw.isActive);

    return data;
  }

  async create(employee: EmployeeRecord): Promise<EmployeeRecord> {
    const data = this.sanitizeForCreate(employee);
    // userId is linked asynchronously by OutboxDispatcher after user provisioning to prevent fk_employees_user violation
    data.userId = null;
    const created = await this.prisma.employee.create({ data });
    await this.syncBankAndStatutory(employee.id, employee);
    await this.syncSalary(employee.id, employee);
    return (await this.findById(employee.id)) || this.enrichEmployeeRecord(created, undefined, undefined, employee.baseSalaryAnnual, employee.salaryStructureId);
  }

  async createWithOutbox(employee: EmployeeRecord, outboxPayload: any): Promise<EmployeeRecord> {
    const data = this.sanitizeForCreate(employee);
    // userId is linked asynchronously by OutboxDispatcher after user provisioning to prevent fk_employees_user violation
    data.userId = null;
    const created = await this.prisma.$transaction(async (tx: any) => {
      const res = await tx.employee.create({ data });
      await tx.provisioningOutbox.create({
        data: {
          employeeId: employee.id,
          email: employee.email.toLowerCase().trim(),
          payload: outboxPayload,
          status: 'PENDING',
          attempts: 0,
        },
      });
      return res;
    });
    await this.syncBankAndStatutory(employee.id, employee);
    await this.syncSalary(employee.id, employee);
    return (await this.findById(employee.id)) || this.enrichEmployeeRecord(created, undefined, undefined, employee.baseSalaryAnnual, employee.salaryStructureId);
  }

  async update(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const data = this.sanitizeForUpdate(updates);
    delete data.id;
    if (Object.keys(data).length > 0) {
      await this.prisma.employee.update({ where: { id }, data });
    }
    await this.syncBankAndStatutory(id, updates);
    await this.syncSalary(id, updates);
    return (await this.findById(id)) || updates as any;
  }

  async updateWithOutbox(id: string, updates: Partial<EmployeeRecord>, outboxPayload: any): Promise<EmployeeRecord> {
    const data = this.sanitizeForUpdate(updates);
    delete data.id;
    await this.prisma.$transaction(async (tx: any) => {
      if (Object.keys(data).length > 0) {
        await tx.employee.update({ where: { id }, data });
      }
      await tx.provisioningOutbox.create({
        data: {
          employeeId: id,
          email: (updates.email || '').toLowerCase().trim(),
          payload: outboxPayload,
          status: 'PENDING',
          attempts: 0,
        },
      });
    });
    await this.syncBankAndStatutory(id, updates);
    await this.syncSalary(id, updates);
    return (await this.findById(id)) || updates as any;
  }

  async delete(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.provisioningOutbox.deleteMany({ where: { employeeId: id } });
      try {
        await (tx as any).$queryRawUnsafe('DELETE FROM employee.service_records WHERE employee_id = $1', id);
        await (tx as any).$queryRawUnsafe('DELETE FROM employee.employee_documents WHERE employee_id = $1', id);
        await (tx as any).$queryRawUnsafe('DELETE FROM employee.employee_bank_details WHERE employee_id = $1', id);
        await (tx as any).$queryRawUnsafe('DELETE FROM employee.employee_statutory_details WHERE employee_id = $1', id);
      } catch {
        // Ignored if table or record does not exist
      }
      await tx.employee.delete({ where: { id } });
      return true;
    });
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

  async getDocuments(employeeId: string): Promise<EmployeeDocumentRecord[]> {
    const rows = await (this.prisma as any).$queryRawUnsafe(`
      SELECT 
        id::text,
        employee_id as "employeeId",
        title,
        document_type as "documentType",
        file_name as "fileName",
        file_size_bytes::bigint as "fileSizeBytes",
        file_url as "fileUrl",
        issue_date as "issueDate",
        expiry_date as "expiryDate",
        verification_status as "verificationStatus",
        verified_by::text as "verifiedBy",
        verified_at as "verifiedAt",
        notes,
        uploaded_by::text as "uploadedBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM employee.employee_documents
      WHERE employee_id = $1
      ORDER BY created_at DESC;
    `, employeeId);

    return (rows || []).map((row: any) => ({
      ...row,
      fileSizeBytes: Number(row.fileSizeBytes || 0),
    }));
  }

  async createDocument(
    doc: Omit<EmployeeDocumentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EmployeeDocumentRecord> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const toUuid = (v?: string | null) => (v && UUID_REGEX.test(v.trim()) ? v.trim() : null);

    const rows = await (this.prisma as any).$queryRawUnsafe(`
      INSERT INTO employee.employee_documents (
        employee_id, title, document_type, file_name, file_size_bytes, file_url,
        issue_date, expiry_date, verification_status, verified_by, verified_at,
        notes, uploaded_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::date, $8::date, $9, $10::uuid, $11::timestamptz,
        $12, $13::uuid, NOW(), NOW()
      )
      RETURNING 
        id::text,
        employee_id as "employeeId",
        title,
        document_type as "documentType",
        file_name as "fileName",
        file_size_bytes::bigint as "fileSizeBytes",
        file_url as "fileUrl",
        issue_date as "issueDate",
        expiry_date as "expiryDate",
        verification_status as "verificationStatus",
        verified_by::text as "verifiedBy",
        verified_at as "verifiedAt",
        notes,
        uploaded_by::text as "uploadedBy",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `,
      doc.employeeId,
      doc.title,
      doc.documentType,
      doc.fileName,
      doc.fileSizeBytes || 0,
      doc.fileUrl,
      doc.issueDate ? (doc.issueDate instanceof Date ? doc.issueDate.toISOString() : doc.issueDate) : null,
      doc.expiryDate ? (doc.expiryDate instanceof Date ? doc.expiryDate.toISOString() : doc.expiryDate) : null,
      doc.verificationStatus || 'Pending',
      toUuid(doc.verifiedBy),
      doc.verifiedAt ? (doc.verifiedAt instanceof Date ? doc.verifiedAt.toISOString() : doc.verifiedAt) : null,
      doc.notes || null,
      toUuid(doc.uploadedBy)
    );

    const row = rows[0];
    return {
      ...row,
      fileSizeBytes: Number(row.fileSizeBytes || 0),
    };
  }

  async deleteDocument(employeeId: string, docId: string): Promise<boolean> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuid = docId && UUID_REGEX.test(docId.trim()) ? docId.trim() : null;
    if (!uuid) return false;

    const count = await (this.prisma as any).$executeRawUnsafe(
      'DELETE FROM employee.employee_documents WHERE id = $1::uuid AND employee_id = $2',
      uuid,
      employeeId
    );
    return count > 0;
  }

  async updateDocumentStatus(
    employeeId: string,
    docId: string,
    status: string,
    notes?: string,
    verifiedBy?: string
  ): Promise<EmployeeDocumentRecord> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const toUuid = (v?: string | null) => (v && UUID_REGEX.test(v.trim()) ? v.trim() : null);
    const uuid = toUuid(docId);
    if (!uuid) {
      throw new Error(`Invalid document ID: ${docId}`);
    }

    const rows = await (this.prisma as any).$queryRawUnsafe(`
      UPDATE employee.employee_documents
      SET 
        verification_status = $3,
        notes = COALESCE($4, notes),
        verified_by = CASE WHEN $3 = 'Verified' THEN COALESCE($5::uuid, verified_by) ELSE verified_by END,
        verified_at = CASE WHEN $3 = 'Verified' THEN NOW() ELSE verified_at END,
        updated_at = NOW()
      WHERE id = $1::uuid AND employee_id = $2
      RETURNING 
        id::text,
        employee_id as "employeeId",
        title,
        document_type as "documentType",
        file_name as "fileName",
        file_size_bytes::bigint as "fileSizeBytes",
        file_url as "fileUrl",
        issue_date as "issueDate",
        expiry_date as "expiryDate",
        verification_status as "verificationStatus",
        verified_by::text as "verifiedBy",
        verified_at as "verifiedAt",
        notes,
        uploaded_by::text as "uploadedBy",
        created_at as "createdAt",
        updated_at as "updatedAt";
    `, uuid, employeeId, status, notes !== undefined ? notes : null, toUuid(verifiedBy));

    if (!rows || rows.length === 0) {
      throw new Error(`Document ${docId} for employee ${employeeId} not found`);
    }

    const row = rows[0];
    return {
      ...row,
      fileSizeBytes: Number(row.fileSizeBytes || 0),
    };
  }
}

