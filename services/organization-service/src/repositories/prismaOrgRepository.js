"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaOrgRepository = void 0;
class PrismaOrgRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapCompanyProfile(raw) {
        return {
            id: raw.id,
            legalName: raw.legalName,
            tradingName: raw.tradingName,
            cinNumber: raw.cinNumber ?? undefined,
            panNumber: raw.panNumber ?? undefined,
            tanNumber: raw.tanNumber ?? undefined,
            gstin: raw.gstin ?? undefined,
            pfRegistrationNumber: raw.pfRegistrationNumber ?? undefined,
            esiRegistrationNumber: raw.esiRegistrationNumber ?? undefined,
            registeredAddress: raw.registeredAddress,
            headquartersAddress: raw.headquartersAddress,
            contactEmail: raw.contactEmail,
            contactPhone: raw.contactPhone,
            website: raw.website ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    mapBranch(raw) {
        return {
            id: raw.id,
            code: raw.code,
            name: raw.name,
            city: raw.city,
            state: raw.state,
            country: raw.country,
            address: raw.address,
            isHeadquarters: raw.isHeadquarters,
            status: raw.status,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    mapDepartment(raw) {
        return {
            id: raw.id,
            code: raw.code,
            name: raw.name,
            branchId: raw.branchId ?? undefined,
            parentDeptId: raw.parentDeptId ?? undefined,
            headEmployeeId: raw.headEmployeeId ?? undefined,
            status: raw.status,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    mapDesignation(raw) {
        return {
            id: raw.id,
            code: raw.code,
            title: raw.title,
            departmentId: raw.departmentId ?? undefined,
            level: raw.level,
            description: raw.description ?? undefined,
            status: raw.status,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
    async getCompanyProfile() {
        const raw = await this.prisma.companyProfiles.findFirst();
        return raw ? this.mapCompanyProfile(raw) : null;
    }
    async saveCompanyProfile(profile) {
        const existing = await this.prisma.companyProfiles.findFirst();
        if (existing) {
            const raw = await this.prisma.companyProfiles.update({
                where: { id: existing.id },
                data: {
                    legalName: profile.legalName ?? existing.legalName,
                    tradingName: profile.tradingName ?? existing.tradingName,
                    cinNumber: profile.cinNumber ?? existing.cinNumber,
                    panNumber: profile.panNumber ?? existing.panNumber,
                    tanNumber: profile.tanNumber ?? existing.tanNumber,
                    gstin: profile.gstin ?? existing.gstin,
                    pfRegistrationNumber: profile.pfRegistrationNumber ?? existing.pfRegistrationNumber,
                    esiRegistrationNumber: profile.esiRegistrationNumber ?? existing.esiRegistrationNumber,
                    registeredAddress: profile.registeredAddress ?? existing.registeredAddress,
                    headquartersAddress: profile.headquartersAddress ?? existing.headquartersAddress,
                    contactEmail: profile.contactEmail ?? existing.contactEmail,
                    contactPhone: profile.contactPhone ?? existing.contactPhone,
                    website: profile.website ?? existing.website,
                },
            });
            return this.mapCompanyProfile(raw);
        }
        else {
            const raw = await this.prisma.companyProfiles.create({
                data: {
                    legalName: profile.legalName || 'Orbyx Technologies Ltd.',
                    tradingName: profile.tradingName || 'Orbyx Tech',
                    cinNumber: profile.cinNumber ?? null,
                    panNumber: profile.panNumber ?? null,
                    tanNumber: profile.tanNumber ?? null,
                    gstin: profile.gstin ?? null,
                    pfRegistrationNumber: profile.pfRegistrationNumber ?? null,
                    esiRegistrationNumber: profile.esiRegistrationNumber ?? null,
                    registeredAddress: profile.registeredAddress || '',
                    headquartersAddress: profile.headquartersAddress || '',
                    contactEmail: profile.contactEmail || 'admin@orbyx.io',
                    contactPhone: profile.contactPhone || '+91 80 1234 5678',
                    website: profile.website ?? null,
                },
            });
            return this.mapCompanyProfile(raw);
        }
    }
    async getBranches() {
        const rawList = await this.prisma.branches.findMany({ orderBy: { name: 'asc' } });
        return rawList.map((r) => this.mapBranch(r));
    }
    async createBranch(branch) {
        const raw = await this.prisma.branches.create({
            data: {
                code: branch.code,
                name: branch.name,
                city: branch.city,
                state: branch.state,
                country: branch.country,
                address: branch.address,
                isHeadquarters: branch.isHeadquarters,
                status: branch.status,
            },
        });
        return this.mapBranch(raw);
    }
    async getBranchById(id) {
        const raw = await this.prisma.branches.findUnique({ where: { id } });
        return raw ? this.mapBranch(raw) : null;
    }
    async getDepartments() {
        const rawList = await this.prisma.departments.findMany({ orderBy: { name: 'asc' } });
        return rawList.map((r) => this.mapDepartment(r));
    }
    async createDepartment(dept) {
        const raw = await this.prisma.departments.create({
            data: {
                code: dept.code,
                name: dept.name,
                branchId: dept.branchId ?? null,
                parentDeptId: dept.parentDeptId ?? null,
                headEmployeeId: dept.headEmployeeId ?? null,
                status: dept.status,
            },
        });
        return this.mapDepartment(raw);
    }
    async getDepartmentById(id) {
        const raw = await this.prisma.departments.findUnique({ where: { id } });
        return raw ? this.mapDepartment(raw) : null;
    }
    async getDesignations() {
        const rawList = await this.prisma.designations.findMany({ orderBy: { level: 'asc' } });
        return rawList.map((r) => this.mapDesignation(r));
    }
    async createDesignation(desig) {
        const raw = await this.prisma.designations.create({
            data: {
                code: desig.code,
                title: desig.title,
                departmentId: desig.departmentId ?? null,
                level: desig.level,
                description: desig.description ?? null,
                status: desig.status,
            },
        });
        return this.mapDesignation(raw);
    }
    async getDesignationById(id) {
        const raw = await this.prisma.designations.findUnique({ where: { id } });
        return raw ? this.mapDesignation(raw) : null;
    }
    async getDesignationByCode(code) {
        const raw = await this.prisma.designations.findUnique({ where: { code } });
        return raw ? this.mapDesignation(raw) : null;
    }
}
exports.PrismaOrgRepository = PrismaOrgRepository;
