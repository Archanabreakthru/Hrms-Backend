"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaEmployeeRepository = void 0;
class PrismaEmployeeRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const raw = await this.prisma.employee.findUnique({ where: { id } });
        return raw;
    }
    async findByEmail(email) {
        const raw = await this.prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
        return raw;
    }
    async findByUserId(userId) {
        const raw = await this.prisma.employee.findUnique({ where: { userId } });
        return raw;
    }
    async findByPan(pan) {
        const raw = await this.prisma.employee.findUnique({ where: { panOrTaxNumber: pan.toUpperCase().trim() } });
        return raw;
    }
    async list(filter) {
        const where = {};
        if (filter?.departmentId)
            where.departmentId = filter.departmentId;
        if (filter?.branchId)
            where.branchId = filter.branchId;
        if (filter?.status)
            where.status = filter.status;
        if (filter?.profileStatus)
            where.profileStatus = filter.profileStatus;
        if (filter?.reportingManagerId)
            where.reportingManagerId = filter.reportingManagerId;
        const page = filter?.page || 1;
        const limit = filter?.limit || 50;
        const skip = (page - 1) * limit;
        const [employees, total] = await Promise.all([
            this.prisma.employee.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.employee.count({ where }),
        ]);
        return { employees: employees, total };
    }
    async create(employee) {
        const created = await this.prisma.employee.create({ data: employee });
        return created;
    }
    async update(id, updates) {
        const updated = await this.prisma.employee.update({ where: { id }, data: updates });
        return updated;
    }
    async allocateNextId(designationCode) {
        const code = designationCode.toUpperCase().trim() || 'GEN';
        // Concurrency-safe atomic increment via PostgreSQL transaction with row-level lock
        const seq = await this.prisma.$transaction(async (tx) => {
            const record = await tx.employeeSequence.upsert({
                where: { prefix: code },
                create: { prefix: code, lastNumber: 1 },
                update: { lastNumber: { increment: 1 } },
            });
            return record.lastNumber;
        });
        return `EMP-${code}-${String(seq).padStart(4, '0')}`;
    }
    async getDirectReports(managerId) {
        const reports = await this.prisma.employee.findMany({ where: { reportingManagerId: managerId } });
        return reports;
    }
}
exports.PrismaEmployeeRepository = PrismaEmployeeRepository;
