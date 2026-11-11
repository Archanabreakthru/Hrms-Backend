import { PrismaClient } from '@prisma/client';
import { IEmployeeRepository, EmployeeRecord } from './employeeRepository';

export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private prisma: PrismaClient) {}

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
    const raw = await this.prisma.employee.findUnique({ where: { panOrTaxNumber: pan.toUpperCase().trim() } });
    return raw as any;
  }

  async list(filter?: {
    departmentId?: string;
    branchId?: string;
    status?: string;
    profileStatus?: string;
    reportingManagerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ employees: EmployeeRecord[]; total: number }> {
    const where: any = {};
    if (filter?.departmentId) where.departmentId = filter.departmentId;
    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.status) where.status = filter.status;
    if (filter?.profileStatus) where.profileStatus = filter.profileStatus;
    if (filter?.reportingManagerId) where.reportingManagerId = filter.reportingManagerId;

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

  async update(id: string, updates: Partial<EmployeeRecord>): Promise<EmployeeRecord> {
    const updated = await this.prisma.employee.update({ where: { id }, data: updates as any });
    return updated as any;
  }

  async allocateNextId(designationCode: string): Promise<string> {
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

  async getDirectReports(managerId: string): Promise<EmployeeRecord[]> {
    const reports = await this.prisma.employee.findMany({ where: { reportingManagerId: managerId } });
    return reports as any;
  }
}

