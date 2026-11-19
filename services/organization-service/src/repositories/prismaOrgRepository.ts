import crypto from 'crypto';
import { PrismaClient } from '../generated/client';
import {
  IOrganizationRepository,
  CompanyProfileRecord,
  StatutoryConfigRecord,
  BranchRecord,
  DepartmentRecord,
  DesignationRecord,
  DelegationRecord,
} from './orgRepository';

/** Convert a statutory effective date to a Prisma-compatible DateTime. */
function toPrismaDate(value: string | Date | undefined | null): Date {
  if (!value) return new Date('2026-04-01T00:00:00.000Z');
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return new Date('2026-04-01T00:00:00.000Z');
    return value;
  }

  const str = String(value).trim();
  if (!str) return new Date('2026-04-01T00:00:00.000Z');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(`${str}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    return new Date('2026-04-01T00:00:00.000Z');
  }
  return date;
}

export class PrismaOrgRepository implements IOrganizationRepository {
  constructor(private prisma: PrismaClient) { }

  private mapCompanyProfile(raw: any): CompanyProfileRecord {
    return {
      id: raw.id,
      legalName: raw.legalName,
      tradingName: raw.tradingName,
      cinNumber: raw.registrationNumber ?? undefined,
      panNumber: raw.panNumber ?? undefined,
      tanNumber: raw.tanNumber ?? undefined,
      gstin: raw.gstNumber ?? undefined,
      iecNumber: raw.iecNumber ?? undefined,
      pfRegistrationNumber: raw.pfRegistrationNumber ?? undefined,
      esiRegistrationNumber: raw.esiRegistrationNumber ?? undefined,
      registeredAddress: raw.address,
      headquartersAddress: raw.address,
      contactEmail: raw.contactEmail,
      contactPhone: raw.contactPhone,
      website: raw.website ?? undefined,
      incorporatedDate: raw.incorporatedDate ?? undefined,
      city: raw.city ?? undefined,
      state: raw.state ?? undefined,
      country: raw.country ?? 'India',
      zipCode: raw.zipCode ?? undefined,
      currency: raw.currency ?? 'INR',
      currencySymbol: raw.currencySymbol ?? '₹',
      workingDaysPerWeek: raw.workingDaysPerWeek !== undefined && raw.workingDaysPerWeek !== null ? Number(raw.workingDaysPerWeek) : 5,
      standardHoursPerDay: raw.standardHoursPerDay !== undefined && raw.standardHoursPerDay !== null ? Number(raw.standardHoursPerDay) : 8,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapStatutoryConfig(raw: any): StatutoryConfigRecord {
    return {
      id: raw.id,
      companyId: raw.companyId,
      epfApplicable: raw.epfApplicable,
      epfEmployeeRatePercent: Number(raw.epfEmployeeRatePercent),
      epfEmployerRatePercent: Number(raw.epfEmployerRatePercent),
      epfWageCeilingMonthly: Number(raw.epfWageCeilingMonthly),
      epfRestrictToWageCeiling: raw.epfRestrictToWageCeiling,
      epfEffectiveFrom: raw.epfEffectiveFrom,
      epfExemptionReason: raw.epfExemptionReason ?? undefined,
      esiApplicable: raw.esiApplicable,
      esiGrossThresholdMonthly: Number(raw.esiGrossThresholdMonthly),
      esiEmployeeRatePercent: Number(raw.esiEmployeeRatePercent),
      esiEmployerRatePercent: Number(raw.esiEmployerRatePercent),
      esiEffectiveFrom: raw.esiEffectiveFrom,
      esiExemptionReason: raw.esiExemptionReason ?? undefined,
      ptApplicable: raw.ptApplicable,
      ptStateJurisdiction: raw.ptStateJurisdiction,
      ptMonthlySlabAmount: Number(raw.ptMonthlySlabAmount),
      ptMinGrossThreshold: Number(raw.ptMinGrossThreshold),
      ptEffectiveFrom: raw.ptEffectiveFrom,
      tdsApplicable: raw.tdsApplicable,
      tdsFinancialYear: raw.tdsFinancialYear,
      tdsDefaultRegime: raw.tdsDefaultRegime,
      tdsEffectiveFrom: raw.tdsEffectiveFrom,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapBranch(raw: any): BranchRecord {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      city: raw.city,
      state: raw.state,
      country: raw.country,
      address: raw.address || '',
      isHeadquarters: raw.isHeadquarters,
      status: raw.isActive ? 'Active' : 'Inactive',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapDepartment(raw: any): DepartmentRecord {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      branchId: raw.branchId ?? undefined,
      parentDeptId: raw.parentDeptId ?? undefined,
      headEmployeeId: raw.headEmployeeId ?? undefined,
      status: raw.isActive ? 'Active' : 'Inactive',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapDesignation(raw: any): DesignationRecord {
    return {
      id: raw.id,
      code: raw.code,
      title: raw.title,
      departmentId: raw.departmentId ?? undefined,
      level: raw.level,
      description: raw.description ?? undefined,
      status: raw.isActive ? 'Active' : 'Inactive',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async getCompanyProfile(): Promise<CompanyProfileRecord | null> {
    const raw = await this.prisma.companyProfiles.findFirst();
    return raw ? this.mapCompanyProfile(raw) : null;
  }

  async saveCompanyProfile(profile: Partial<CompanyProfileRecord>): Promise<CompanyProfileRecord> {
    const existing = await this.prisma.companyProfiles.findFirst();
    const incDate = profile.incorporatedDate
      ? (typeof profile.incorporatedDate === 'string'
          ? (/^\d{4}-\d{2}-\d{2}$/.test(profile.incorporatedDate)
              ? new Date(`${profile.incorporatedDate}T00:00:00.000Z`)
              : new Date(profile.incorporatedDate))
          : profile.incorporatedDate)
      : undefined;

    if (existing) {
      const raw = await this.prisma.companyProfiles.update({
        where: { id: existing.id },
        data: {
          legalName: profile.legalName ?? existing.legalName,
          tradingName: profile.tradingName ?? existing.tradingName,
          registrationNumber: profile.cinNumber ?? existing.registrationNumber,
          incorporatedDate: incDate ?? existing.incorporatedDate,
          panNumber: profile.panNumber ?? existing.panNumber,
          tanNumber: profile.tanNumber ?? existing.tanNumber,
          gstNumber: profile.gstin ?? existing.gstNumber,
          iecNumber: profile.iecNumber ?? existing.iecNumber,
          pfRegistrationNumber: profile.pfRegistrationNumber ?? existing.pfRegistrationNumber,
          esiRegistrationNumber: profile.esiRegistrationNumber ?? existing.esiRegistrationNumber,
          address: profile.headquartersAddress || profile.registeredAddress || existing.address,
          city: profile.city ?? existing.city,
          state: profile.state ?? existing.state,
          country: profile.country ?? existing.country,
          zipCode: profile.zipCode ?? existing.zipCode,
          workingDaysPerWeek: profile.workingDaysPerWeek !== undefined ? profile.workingDaysPerWeek : existing.workingDaysPerWeek,
          standardHoursPerDay: profile.standardHoursPerDay !== undefined ? profile.standardHoursPerDay : existing.standardHoursPerDay,
          currency: profile.currency ?? existing.currency,
          currencySymbol: profile.currencySymbol ?? existing.currencySymbol,
          contactEmail: profile.contactEmail ?? existing.contactEmail,
          contactPhone: profile.contactPhone ?? existing.contactPhone,
          website: profile.website ?? existing.website,
        },
      });
      return this.mapCompanyProfile(raw);
    } else {
      const raw = await this.prisma.companyProfiles.create({
        data: {
          legalName: profile.legalName || 'Celestial Technologies Ltd.',
          tradingName: profile.tradingName || 'Celestial Tech',
          registrationNumber: profile.cinNumber ?? null,
          incorporatedDate: incDate ?? null,
          panNumber: profile.panNumber ?? null,
          tanNumber: profile.tanNumber ?? null,
          gstNumber: profile.gstin ?? null,
          iecNumber: profile.iecNumber ?? null,
          pfRegistrationNumber: profile.pfRegistrationNumber ?? null,
          esiRegistrationNumber: profile.esiRegistrationNumber ?? null,
          address: profile.headquartersAddress || profile.registeredAddress || '',
          city: profile.city || 'Bengaluru',
          state: profile.state || 'Karnataka',
          country: profile.country || 'India',
          zipCode: profile.zipCode || '560100',
          workingDaysPerWeek: profile.workingDaysPerWeek !== undefined ? profile.workingDaysPerWeek : 5,
          standardHoursPerDay: profile.standardHoursPerDay !== undefined ? profile.standardHoursPerDay : 8.0,
          currency: profile.currency || 'INR',
          currencySymbol: profile.currencySymbol || '₹',
          contactEmail: profile.contactEmail || 'admin@orbyx.io',
          contactPhone: profile.contactPhone || '+91 80 1234 5678',
          website: profile.website ?? null,
        },
      });
      return this.mapCompanyProfile(raw);
    }
  }

  async getStatutoryConfig(): Promise<StatutoryConfigRecord | null> {
    const raw = await this.prisma.statutoryComplianceConfigs.findFirst();
    return raw ? this.mapStatutoryConfig(raw) : null;
  }

  async saveStatutoryConfig(config: Partial<StatutoryConfigRecord>): Promise<StatutoryConfigRecord> {
    const existing = await this.prisma.statutoryComplianceConfigs.findFirst();
    let companyId = config.companyId;
    if (!companyId) {
      const comp = await this.prisma.companyProfiles.findFirst();
      companyId = comp?.id || '00000000-0000-0000-0000-000000000000';
    }

    if (existing) {
      const raw = await this.prisma.statutoryComplianceConfigs.update({
        where: { id: existing.id },
        data: {
          epfApplicable: config.epfApplicable ?? existing.epfApplicable,
          epfEmployeeRatePercent: config.epfEmployeeRatePercent !== undefined ? config.epfEmployeeRatePercent : existing.epfEmployeeRatePercent,
          epfEmployerRatePercent: config.epfEmployerRatePercent !== undefined ? config.epfEmployerRatePercent : existing.epfEmployerRatePercent,
          epfWageCeilingMonthly: config.epfWageCeilingMonthly !== undefined ? config.epfWageCeilingMonthly : existing.epfWageCeilingMonthly,
          epfRestrictToWageCeiling: config.epfRestrictToWageCeiling ?? existing.epfRestrictToWageCeiling,
          epfEffectiveFrom: toPrismaDate(config.epfEffectiveFrom ?? existing.epfEffectiveFrom),
          epfExemptionReason: config.epfExemptionReason !== undefined ? config.epfExemptionReason : existing.epfExemptionReason,
          esiApplicable: config.esiApplicable ?? existing.esiApplicable,
          esiGrossThresholdMonthly: config.esiGrossThresholdMonthly !== undefined ? config.esiGrossThresholdMonthly : existing.esiGrossThresholdMonthly,
          esiEmployeeRatePercent: config.esiEmployeeRatePercent !== undefined ? config.esiEmployeeRatePercent : existing.esiEmployeeRatePercent,
          esiEmployerRatePercent: config.esiEmployerRatePercent !== undefined ? config.esiEmployerRatePercent : existing.esiEmployerRatePercent,
          esiEffectiveFrom: toPrismaDate(config.esiEffectiveFrom ?? existing.esiEffectiveFrom),
          esiExemptionReason: config.esiExemptionReason !== undefined ? config.esiExemptionReason : existing.esiExemptionReason,
          ptApplicable: config.ptApplicable ?? existing.ptApplicable,
          ptStateJurisdiction: config.ptStateJurisdiction ?? existing.ptStateJurisdiction,
          ptMonthlySlabAmount: config.ptMonthlySlabAmount !== undefined ? config.ptMonthlySlabAmount : existing.ptMonthlySlabAmount,
          ptMinGrossThreshold: config.ptMinGrossThreshold !== undefined ? config.ptMinGrossThreshold : existing.ptMinGrossThreshold,
          ptEffectiveFrom: toPrismaDate(config.ptEffectiveFrom ?? existing.ptEffectiveFrom),
          tdsApplicable: config.tdsApplicable ?? existing.tdsApplicable,
          tdsFinancialYear: config.tdsFinancialYear ?? existing.tdsFinancialYear,
          tdsDefaultRegime: config.tdsDefaultRegime ?? existing.tdsDefaultRegime,
          tdsEffectiveFrom: toPrismaDate(config.tdsEffectiveFrom ?? existing.tdsEffectiveFrom),
        },
      });
      return this.mapStatutoryConfig(raw);
    } else {
      const raw = await this.prisma.statutoryComplianceConfigs.create({
        data: {
          companyId,
          epfApplicable: config.epfApplicable ?? true,
          epfEmployeeRatePercent: config.epfEmployeeRatePercent ?? 12,
          epfEmployerRatePercent: config.epfEmployerRatePercent ?? 12,
          epfWageCeilingMonthly: config.epfWageCeilingMonthly ?? 15000,
          epfRestrictToWageCeiling: config.epfRestrictToWageCeiling ?? false,
          epfEffectiveFrom: toPrismaDate(config.epfEffectiveFrom ?? '2026-04-01'),
          epfExemptionReason: config.epfExemptionReason ?? null,
          esiApplicable: config.esiApplicable ?? true,
          esiGrossThresholdMonthly: config.esiGrossThresholdMonthly ?? 21000,
          esiEmployeeRatePercent: config.esiEmployeeRatePercent ?? 0.75,
          esiEmployerRatePercent: config.esiEmployerRatePercent ?? 3.25,
          esiEffectiveFrom: toPrismaDate(config.esiEffectiveFrom ?? '2026-04-01'),
          esiExemptionReason: config.esiExemptionReason ?? null,
          ptApplicable: config.ptApplicable ?? true,
          ptStateJurisdiction: config.ptStateJurisdiction ?? 'Karnataka',
          ptMonthlySlabAmount: config.ptMonthlySlabAmount ?? 200,
          ptMinGrossThreshold: config.ptMinGrossThreshold ?? 15000,
          ptEffectiveFrom: toPrismaDate(config.ptEffectiveFrom ?? '2026-04-01'),
          tdsApplicable: config.tdsApplicable ?? true,
          tdsFinancialYear: config.tdsFinancialYear ?? 'FY 2026-27',
          tdsDefaultRegime: config.tdsDefaultRegime ?? 'New Regime (FY 2026-27)',
          tdsEffectiveFrom: toPrismaDate(config.tdsEffectiveFrom ?? '2026-04-01'),
        },
      });
      return this.mapStatutoryConfig(raw);
    }
  }

  async getBranches(): Promise<BranchRecord[]> {
    const rawList = await this.prisma.branches.findMany({ orderBy: { name: 'asc' } });
    return rawList.map((r) => this.mapBranch(r));
  }

  async createBranch(branch: Omit<BranchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BranchRecord> {
    const raw = await this.prisma.branches.create({
      data: {
        code: branch.code,
        name: branch.name,
        city: branch.city,
        state: branch.state,
        country: branch.country,
        address: branch.address,
        isHeadquarters: branch.isHeadquarters,
        isActive: branch.status === 'Active',
      },
    });
    return this.mapBranch(raw);
  }

  async getBranchById(id: string): Promise<BranchRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const raw = await this.prisma.branches.findUnique({ where: { id } });
      return raw ? this.mapBranch(raw) : null;
    }
    const raw = await this.prisma.branches.findFirst({ where: { code: id.replace(/^BR-/i, '') } });
    return raw ? this.mapBranch(raw) : null;
  }

  async updateBranch(id: string, patch: Partial<BranchRecord>): Promise<BranchRecord> {
    const existing = await this.getBranchById(id);
    if (!existing) throw new Error(`Branch ${id} not found`);

    const data: any = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.city !== undefined) data.city = patch.city;
    if (patch.state !== undefined) data.state = patch.state;
    if (patch.country !== undefined) data.country = patch.country;
    if (patch.address !== undefined) data.address = patch.address;
    if (patch.isHeadquarters !== undefined) data.isHeadquarters = patch.isHeadquarters;
    if (patch.status !== undefined) data.isActive = patch.status === 'Active';

    const raw = await this.prisma.branches.update({
      where: { id: existing.id },
      data,
    });
    return this.mapBranch(raw);
  }

  async getDepartments(): Promise<DepartmentRecord[]> {
    const rawList = await this.prisma.departments.findMany({ orderBy: { name: 'asc' } });
    return rawList.map((r) => this.mapDepartment(r));
  }

  async createDepartment(dept: Omit<DepartmentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentRecord> {
    const raw = await this.prisma.departments.create({
      data: {
        code: dept.code,
        name: dept.name,
        branchId: dept.branchId ?? null,
        parentDeptId: dept.parentDeptId ?? null,
        headEmployeeId: dept.headEmployeeId ?? null,
        description: dept.name,
        isActive: dept.status === 'Active',
      },
    });
    return this.mapDepartment(raw);
  }

  async getDepartmentById(id: string): Promise<DepartmentRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const raw = await this.prisma.departments.findUnique({ where: { id } });
      return raw ? this.mapDepartment(raw) : null;
    }
    const raw = await this.prisma.departments.findFirst({ where: { code: id.replace(/^DEP-/i, '') } });
    return raw ? this.mapDepartment(raw) : null;
  }

  async updateDepartment(id: string, patch: Partial<DepartmentRecord>): Promise<DepartmentRecord> {
    const existing = await this.getDepartmentById(id);
    if (!existing) throw new Error(`Department ${id} not found`);

    const data: any = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.branchId !== undefined) data.branchId = patch.branchId;
    if (patch.parentDeptId !== undefined) data.parentDeptId = patch.parentDeptId;
    if (patch.headEmployeeId !== undefined) data.headEmployeeId = patch.headEmployeeId;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.status !== undefined) data.isActive = patch.status === 'Active';

    const raw = await this.prisma.departments.update({
      where: { id: existing.id },
      data,
    });
    return this.mapDepartment(raw);
  }

  async getDesignations(): Promise<DesignationRecord[]> {
    const rawList = await this.prisma.designations.findMany({ orderBy: { level: 'asc' } });
    return rawList.map((r) => this.mapDesignation(r));
  }

  async createDesignation(desig: Omit<DesignationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DesignationRecord> {
    let deptUuid: string | null = null;
    if (desig.departmentId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(desig.departmentId);
      if (isUuid) {
        deptUuid = desig.departmentId;
      } else {
        const foundDept = await this.prisma.departments.findFirst({
          where: { OR: [{ code: desig.departmentId }, { name: desig.departmentId }] },
        });
        deptUuid = foundDept?.id || null;
      }
    }

    const raw = await this.prisma.designations.create({
      data: {
        code: desig.code,
        title: desig.title,
        departmentId: deptUuid,
        level: desig.level,
        description: desig.description ?? null,
        isActive: desig.status === 'Active',
      },
    });

    try {
      await (this.prisma as any).$queryRawUnsafe(`
        INSERT INTO org.designations (id, code, title, department_id, level, description, is_active, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          title = EXCLUDED.title,
          department_id = EXCLUDED.department_id,
          level = EXCLUDED.level,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at;
      `, raw.id, raw.code, raw.title, raw.departmentId, raw.level, raw.description, raw.isActive, raw.createdAt, raw.updatedAt);
    } catch {}

    return this.mapDesignation(raw);
  }

  async getDesignationById(id: string): Promise<DesignationRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const raw = await this.prisma.designations.findUnique({ where: { id } });
      return raw ? this.mapDesignation(raw) : null;
    }
    const raw = await this.prisma.designations.findFirst({ where: { code: id.replace(/^DES-/i, '') } });
    return raw ? this.mapDesignation(raw) : null;
  }

  async updateDesignation(id: string, patch: Partial<DesignationRecord>): Promise<DesignationRecord> {
    const existing = await this.getDesignationById(id);
    if (!existing) throw new Error(`Designation ${id} not found`);

    const data: any = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.level !== undefined) data.level = patch.level;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.status !== undefined) data.isActive = patch.status === 'Active';
    if (patch.departmentId !== undefined) {
      if (!patch.departmentId) {
        data.departmentId = null;
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patch.departmentId);
        if (isUuid) {
          data.departmentId = patch.departmentId;
        } else {
          const foundDept = await this.prisma.departments.findFirst({
            where: { OR: [{ code: patch.departmentId }, { name: patch.departmentId }] },
          });
          data.departmentId = foundDept?.id || null;
        }
      }
    }

    const raw = await this.prisma.designations.update({
      where: { id: existing.id },
      data,
    });
    return this.mapDesignation(raw);
  }

  async getDesignationByCode(code: string): Promise<DesignationRecord | null> {
    const raw = await this.prisma.designations.findFirst({ where: { code } });
    return raw ? this.mapDesignation(raw) : null;
  }

  async deleteBranch(id: string): Promise<boolean> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await this.prisma.branches.delete({ where: { id } });
    } else {
      const b = await this.prisma.branches.findFirst({ where: { code: id } });
      if (b) await this.prisma.branches.delete({ where: { id: b.id } });
    }
    return true;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await this.prisma.departments.delete({ where: { id } });
    } else {
      const d = await this.prisma.departments.findFirst({ where: { code: id.replace(/^DEP-/i, '') } });
      if (d) await this.prisma.departments.delete({ where: { id: d.id } });
    }
    return true;
  }

  async deleteDesignation(id: string): Promise<boolean> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let targetId = id;
    if (isUuid) {
      await this.prisma.designations.delete({ where: { id } });
    } else {
      const d = await this.prisma.designations.findFirst({ where: { code: id.replace(/^DES-/i, '') } });
      if (d) {
        targetId = d.id;
        await this.prisma.designations.delete({ where: { id: d.id } });
      }
    }
    try {
      await (this.prisma as any).$queryRawUnsafe(`DELETE FROM org.designations WHERE id = $1::uuid OR code = $2`, targetId, id);
    } catch {}
    return true;
  }

  async getDelegations(): Promise<DelegationRecord[]> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, delegator_user_id as "delegatorUserId", delegator_employee_id as "delegatorEmployeeId",
              delegate_user_id as "delegateUserId", delegate_employee_id as "delegateEmployeeId",
              permitted_actions as "permittedActions", applicable_modules as "applicableModules",
              to_char(effective_from, 'YYYY-MM-DD') as "effectiveFrom",
              to_char(effective_to, 'YYYY-MM-DD') as "effectiveTo",
              reason, status, revoked_at as "revokedAt", revoked_by as "revokedBy",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM org.delegations
       ORDER BY created_at DESC`
    );
    return rows;
  }

  async createDelegation(data: Omit<DelegationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DelegationRecord> {
    const id = crypto.randomUUID();
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `INSERT INTO org.delegations (
        id, delegator_user_id, delegator_employee_id, delegate_user_id, delegate_employee_id,
        permitted_actions, applicable_modules, effective_from, effective_to, reason, status, created_at, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4::uuid, $5,
        $6::text[], $7::text[], $8::date, $9::date, $10, $11, NOW(), NOW()
      ) RETURNING id, delegator_user_id as "delegatorUserId", delegator_employee_id as "delegatorEmployeeId",
                  delegate_user_id as "delegateUserId", delegate_employee_id as "delegateEmployeeId",
                  permitted_actions as "permittedActions", applicable_modules as "applicableModules",
                  to_char(effective_from, 'YYYY-MM-DD') as "effectiveFrom",
                  to_char(effective_to, 'YYYY-MM-DD') as "effectiveTo",
                  reason, status, created_at as "createdAt", updated_at as "updatedAt"`,
      id,
      data.delegatorUserId,
      data.delegatorEmployeeId || null,
      data.delegateUserId,
      data.delegateEmployeeId || null,
      data.permittedActions || [],
      data.applicableModules || [],
      data.effectiveFrom,
      data.effectiveTo,
      data.reason,
      data.status || 'Active'
    );
    return rows[0];
  }

  async revokeDelegation(id: string, revokedBy: string): Promise<DelegationRecord> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `UPDATE org.delegations
       SET status = 'Revoked', revoked_at = NOW(), revoked_by = $2::uuid, updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id, delegator_user_id as "delegatorUserId", delegator_employee_id as "delegatorEmployeeId",
                 delegate_user_id as "delegateUserId", delegate_employee_id as "delegateEmployeeId",
                 permitted_actions as "permittedActions", applicable_modules as "applicableModules",
                 to_char(effective_from, 'YYYY-MM-DD') as "effectiveFrom",
                 to_char(effective_to, 'YYYY-MM-DD') as "effectiveTo",
                 reason, status, revoked_at as "revokedAt", revoked_by as "revokedBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      id,
      revokedBy
    );
    return rows[0];
  }
}
