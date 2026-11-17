import { PrismaClient } from '../generated/client';
import {
  IOrganizationRepository,
  CompanyProfileRecord,
  StatutoryConfigRecord,
  BranchRecord,
  DepartmentRecord,
  DesignationRecord,
} from './orgRepository';

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
      pfRegistrationNumber: raw.pfRegistrationNumber ?? undefined,
      esiRegistrationNumber: raw.esiRegistrationNumber ?? undefined,
      registeredAddress: raw.address,
      headquartersAddress: raw.address,
      contactEmail: raw.contactEmail,
      contactPhone: raw.contactPhone,
      website: raw.website ?? undefined,
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
    if (existing) {
      const raw = await this.prisma.companyProfiles.update({
        where: { id: existing.id },
        data: {
          legalName: profile.legalName ?? existing.legalName,
          tradingName: profile.tradingName ?? existing.tradingName,
          registrationNumber: profile.cinNumber ?? existing.registrationNumber,
          panNumber: profile.panNumber ?? existing.panNumber,
          tanNumber: profile.tanNumber ?? existing.tanNumber,
          gstNumber: profile.gstin ?? existing.gstNumber,
          pfRegistrationNumber: profile.pfRegistrationNumber ?? existing.pfRegistrationNumber,
          esiRegistrationNumber: profile.esiRegistrationNumber ?? existing.esiRegistrationNumber,
          address: profile.headquartersAddress || profile.registeredAddress || existing.address,
          contactEmail: profile.contactEmail ?? existing.contactEmail,
          contactPhone: profile.contactPhone ?? existing.contactPhone,
          website: profile.website ?? existing.website,
        },
      });
      return this.mapCompanyProfile(raw);
    } else {
      const raw = await this.prisma.companyProfiles.create({
        data: {
          legalName: profile.legalName || 'Orbyx Technologies Ltd.',
          tradingName: profile.tradingName || 'Orbyx Tech',
          registrationNumber: profile.cinNumber ?? null,
          panNumber: profile.panNumber ?? null,
          tanNumber: profile.tanNumber ?? null,
          gstNumber: profile.gstin ?? null,
          pfRegistrationNumber: profile.pfRegistrationNumber ?? null,
          esiRegistrationNumber: profile.esiRegistrationNumber ?? null,
          address: profile.headquartersAddress || profile.registeredAddress || '',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          zipCode: '560100',
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
          epfEffectiveFrom: config.epfEffectiveFrom ?? existing.epfEffectiveFrom,
          epfExemptionReason: config.epfExemptionReason !== undefined ? config.epfExemptionReason : existing.epfExemptionReason,
          esiApplicable: config.esiApplicable ?? existing.esiApplicable,
          esiGrossThresholdMonthly: config.esiGrossThresholdMonthly !== undefined ? config.esiGrossThresholdMonthly : existing.esiGrossThresholdMonthly,
          esiEmployeeRatePercent: config.esiEmployeeRatePercent !== undefined ? config.esiEmployeeRatePercent : existing.esiEmployeeRatePercent,
          esiEmployerRatePercent: config.esiEmployerRatePercent !== undefined ? config.esiEmployerRatePercent : existing.esiEmployerRatePercent,
          esiEffectiveFrom: config.esiEffectiveFrom ?? existing.esiEffectiveFrom,
          esiExemptionReason: config.esiExemptionReason !== undefined ? config.esiExemptionReason : existing.esiExemptionReason,
          ptApplicable: config.ptApplicable ?? existing.ptApplicable,
          ptStateJurisdiction: config.ptStateJurisdiction ?? existing.ptStateJurisdiction,
          ptMonthlySlabAmount: config.ptMonthlySlabAmount !== undefined ? config.ptMonthlySlabAmount : existing.ptMonthlySlabAmount,
          ptMinGrossThreshold: config.ptMinGrossThreshold !== undefined ? config.ptMinGrossThreshold : existing.ptMinGrossThreshold,
          ptEffectiveFrom: config.ptEffectiveFrom ?? existing.ptEffectiveFrom,
          tdsApplicable: config.tdsApplicable ?? existing.tdsApplicable,
          tdsFinancialYear: config.tdsFinancialYear ?? existing.tdsFinancialYear,
          tdsDefaultRegime: config.tdsDefaultRegime ?? existing.tdsDefaultRegime,
          tdsEffectiveFrom: config.tdsEffectiveFrom ?? existing.tdsEffectiveFrom,
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
          epfEffectiveFrom: config.epfEffectiveFrom ?? new Date('2026-04-01'),
          epfExemptionReason: config.epfExemptionReason ?? null,
          esiApplicable: config.esiApplicable ?? true,
          esiGrossThresholdMonthly: config.esiGrossThresholdMonthly ?? 21000,
          esiEmployeeRatePercent: config.esiEmployeeRatePercent ?? 0.75,
          esiEmployerRatePercent: config.esiEmployerRatePercent ?? 3.25,
          esiEffectiveFrom: config.esiEffectiveFrom ?? new Date('2026-04-01'),
          esiExemptionReason: config.esiExemptionReason ?? null,
          ptApplicable: config.ptApplicable ?? true,
          ptStateJurisdiction: config.ptStateJurisdiction ?? 'Karnataka',
          ptMonthlySlabAmount: config.ptMonthlySlabAmount ?? 200,
          ptMinGrossThreshold: config.ptMinGrossThreshold ?? 15000,
          ptEffectiveFrom: config.ptEffectiveFrom ?? new Date('2026-04-01'),
          tdsApplicable: config.tdsApplicable ?? true,
          tdsFinancialYear: config.tdsFinancialYear ?? 'FY 2026-27',
          tdsDefaultRegime: config.tdsDefaultRegime ?? 'New Regime (FY 2026-27)',
          tdsEffectiveFrom: config.tdsEffectiveFrom ?? new Date('2026-04-01'),
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
    const raw = await this.prisma.designations.create({
      data: {
        code: desig.code,
        title: desig.title,
        departmentId: desig.departmentId ?? null,
        level: desig.level,
        description: desig.description ?? null,
        isActive: desig.status === 'Active',
      },
    });
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
    if (patch.departmentId !== undefined) data.departmentId = patch.departmentId;
    if (patch.level !== undefined) data.level = patch.level;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.status !== undefined) data.isActive = patch.status === 'Active';

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
}
