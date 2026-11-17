import { PrismaClient } from '../generated/client';
import {
  IClientRepository,
  ClientOrgDTO,
  ClientSupervisorDTO,
  ClientDeploymentDTO,
  ClientAttendanceVerificationDTO,
} from './clientRepository';

export class PrismaClientRepository implements IClientRepository {
  constructor(private prisma: PrismaClient) {}

  // ==========================================
  // Client Organizations
  // ==========================================

  async findClientById(id: string): Promise<ClientOrgDTO | null> {
    const raw = await this.prisma.clientOrganization.findUnique({
      where: { id },
    });
    return raw ? this.mapClient(raw) : null;
  }

  async listClients(): Promise<ClientOrgDTO[]> {
    const list = await this.prisma.clientOrganization.findMany({
      orderBy: { name: 'asc' },
    });
    return list.map(this.mapClient);
  }

  async saveClient(client: ClientOrgDTO): Promise<ClientOrgDTO> {
    const code = client.code || (client.name.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4));
    const saved = await this.prisma.clientOrganization.upsert({
      where: { id: client.id },
      create: {
        id: client.id,
        name: client.name,
        code: code,
        contactName: client.contactName || null,
        email: client.email || null,
        phone: client.phone || null,
        address: client.address || null,
        city: client.city || null,
        state: client.state || null,
        country: client.country || 'India',
        contractStart: client.contractStart ? new Date(client.contractStart) : null,
        contractEnd: client.contractEnd ? new Date(client.contractEnd) : null,
        status: client.status,
      },
      update: {
        name: client.name,
        code: client.code || code,
        contactName: client.contactName || null,
        email: client.email || null,
        phone: client.phone || null,
        address: client.address || null,
        city: client.city || null,
        state: client.state || null,
        country: client.country || 'India',
        contractStart: client.contractStart ? new Date(client.contractStart) : null,
        contractEnd: client.contractEnd ? new Date(client.contractEnd) : null,
        status: client.status,
      },
    });
    return this.mapClient(saved);
  }

  // ==========================================
  // Client Supervisors
  // ==========================================

  async findSupervisorById(id: string): Promise<ClientSupervisorDTO | null> {
    const raw = await this.prisma.clientSupervisor.findUnique({
      where: { id },
    });
    return raw ? this.mapSupervisor(raw) : null;
  }

  async findSupervisorByUserId(userId: string): Promise<ClientSupervisorDTO | null> {
    const raw = await this.prisma.clientSupervisor.findUnique({
      where: { userId },
    });
    return raw ? this.mapSupervisor(raw) : null;
  }

  async listSupervisors(clientId?: string): Promise<ClientSupervisorDTO[]> {
    const where = clientId ? { clientId } : {};
    const list = await this.prisma.clientSupervisor.findMany({
      where,
      orderBy: { fullName: 'asc' },
    });
    return list.map(this.mapSupervisor);
  }

  async saveSupervisor(sup: ClientSupervisorDTO): Promise<ClientSupervisorDTO> {
    const saved = await this.prisma.clientSupervisor.upsert({
      where: { id: sup.id },
      create: {
        id: sup.id,
        clientId: sup.clientId,
        fullName: sup.fullName,
        email: sup.email,
        phone: sup.phone || null,
        designation: sup.designation || null,
        status: sup.status,
        userId: sup.userId || null,
      },
      update: {
        clientId: sup.clientId,
        fullName: sup.fullName,
        email: sup.email,
        phone: sup.phone || null,
        designation: sup.designation || null,
        status: sup.status,
        userId: sup.userId || null,
      },
    });
    return this.mapSupervisor(saved);
  }

  // ==========================================
  // Client Deployments
  // ==========================================

  async findDeploymentById(id: string): Promise<ClientDeploymentDTO | null> {
    const raw = await this.prisma.clientDeployment.findUnique({
      where: { id },
    });
    return raw ? this.mapDeployment(raw) : null;
  }

  async findActiveDeploymentForDate(employeeId: string, date: string): Promise<ClientDeploymentDTO | null> {
    const targetDate = new Date(date);
    const raw = await this.prisma.clientDeployment.findFirst({
      where: {
        employeeId,
        status: 'Active',
        startDate: { lte: targetDate },
        plannedEndDate: { gte: targetDate },
      },
    });
    return raw ? this.mapDeployment(raw) : null;
  }

  async listDeployments(filter: { clientId?: string; employeeId?: string; status?: string }): Promise<ClientDeploymentDTO[]> {
    const where: any = {};
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;

    const list = await this.prisma.clientDeployment.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
    return list.map(this.mapDeployment);
  }

  async saveDeployment(dep: ClientDeploymentDTO): Promise<ClientDeploymentDTO> {
    const saved = await this.prisma.clientDeployment.upsert({
      where: { id: dep.id },
      create: {
        id: dep.id,
        clientId: dep.clientId,
        employeeId: dep.employeeId,
        supervisorId: dep.supervisorId || null,
        project: dep.project,
        location: dep.location,
        workMode: dep.workMode,
        startDate: new Date(dep.startDate),
        plannedEndDate: new Date(dep.plannedEndDate),
        actualEndDate: dep.actualEndDate ? new Date(dep.actualEndDate) : null,
        allocation: dep.allocation as any,
        allowanceMonthly: dep.allowanceMonthly as any,
        status: dep.status,
      },
      update: {
        clientId: dep.clientId,
        employeeId: dep.employeeId,
        supervisorId: dep.supervisorId || null,
        project: dep.project,
        location: dep.location,
        workMode: dep.workMode,
        startDate: new Date(dep.startDate),
        plannedEndDate: new Date(dep.plannedEndDate),
        actualEndDate: dep.actualEndDate ? new Date(dep.actualEndDate) : null,
        allocation: dep.allocation as any,
        allowanceMonthly: dep.allowanceMonthly as any,
        status: dep.status,
      },
    });
    return this.mapDeployment(saved);
  }

  // ==========================================
  // Attendance Verifications
  // ==========================================

  async findVerificationById(id: string): Promise<ClientAttendanceVerificationDTO | null> {
    const raw = await this.prisma.clientAttendanceVerification.findUnique({
      where: { id },
    });
    return raw ? this.mapVerification(raw) : null;
  }

  async findVerificationByAttendanceId(attendanceId: string): Promise<ClientAttendanceVerificationDTO | null> {
    const raw = await this.prisma.clientAttendanceVerification.findUnique({
      where: { attendanceId },
    });
    return raw ? this.mapVerification(raw) : null;
  }

  async listVerifications(filter: { clientId?: string; employeeId?: string; periodKey?: string; status?: string }): Promise<ClientAttendanceVerificationDTO[]> {
    const where: any = {};
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.periodKey) where.periodKey = filter.periodKey;
    if (filter.status) where.clientVerificationStatus = filter.status as any;

    const list = await this.prisma.clientAttendanceVerification.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return list.map(this.mapVerification);
  }

  async saveVerification(verif: ClientAttendanceVerificationDTO): Promise<ClientAttendanceVerificationDTO> {
    const saved = await this.prisma.clientAttendanceVerification.upsert({
      where: { id: verif.id },
      create: {
        id: verif.id,
        attendanceId: verif.attendanceId,
        employeeId: verif.employeeId,
        clientId: verif.clientId,
        deploymentId: verif.deploymentId,
        supervisorId: verif.supervisorId || null,
        date: new Date(verif.date),
        periodKey: verif.periodKey,
        workingHours: verif.workingHours,
        workMode: verif.workMode,
        notes: verif.notes || null,
        clientVerificationStatus: verif.clientVerificationStatus as any,
        clientVerifiedAt: verif.clientVerifiedAt ? new Date(verif.clientVerifiedAt) : null,
        clientVerifiedBy: verif.clientVerifiedBy || null,
        disputeDetails: verif.disputeDetails || null,
        companyApprovalStatus: verif.companyApprovalStatus,
        companyApprovedAt: verif.companyApprovedAt ? new Date(verif.companyApprovedAt) : null,
        companyApprovedBy: verif.companyApprovedBy || null,
        companyComments: verif.companyComments || null,
        payrollEligibilityStatus: verif.payrollEligibilityStatus as any,
        approvalHistory: verif.approvalHistory as any,
      },
      update: {
        workingHours: verif.workingHours,
        notes: verif.notes || null,
        clientVerificationStatus: verif.clientVerificationStatus as any,
        clientVerifiedAt: verif.clientVerifiedAt ? new Date(verif.clientVerifiedAt) : null,
        clientVerifiedBy: verif.clientVerifiedBy || null,
        disputeDetails: verif.disputeDetails || null,
        companyApprovalStatus: verif.companyApprovalStatus,
        companyApprovedAt: verif.companyApprovedAt ? new Date(verif.companyApprovedAt) : null,
        companyApprovedBy: verif.companyApprovedBy || null,
        companyComments: verif.companyComments || null,
        payrollEligibilityStatus: verif.payrollEligibilityStatus as any,
        approvalHistory: verif.approvalHistory as any,
      },
    });
    return this.mapVerification(saved);
  }

  // ==========================================
  // Entity Mappers
  // ==========================================

  private mapClient(raw: any): ClientOrgDTO {
    return {
      id: raw.id,
      name: raw.name,
      code: raw.code || undefined,
      contactName: raw.contactName || undefined,
      email: raw.email || undefined,
      phone: raw.phone || undefined,
      address: raw.address || undefined,
      city: raw.city || undefined,
      state: raw.state || undefined,
      country: raw.country || undefined,
      contractStart: raw.contractStart ? raw.contractStart.toISOString() : undefined,
      contractEnd: raw.contractEnd ? raw.contractEnd.toISOString() : undefined,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapSupervisor(raw: any): ClientSupervisorDTO {
    return {
      id: raw.id,
      clientId: raw.clientId,
      fullName: raw.fullName,
      email: raw.email,
      phone: raw.phone || undefined,
      designation: raw.designation || undefined,
      status: raw.status,
      userId: raw.userId || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapDeployment(raw: any): ClientDeploymentDTO {
    return {
      id: raw.id,
      clientId: raw.clientId,
      employeeId: raw.employeeId,
      supervisorId: raw.supervisorId || undefined,
      project: raw.project,
      location: raw.location,
      workMode: raw.workMode,
      startDate: raw.startDate ? raw.startDate.toISOString().split('T')[0] : '',
      plannedEndDate: raw.plannedEndDate ? raw.plannedEndDate.toISOString().split('T')[0] : '',
      actualEndDate: raw.actualEndDate ? raw.actualEndDate.toISOString().split('T')[0] : undefined,
      allocation: Number(raw.allocation),
      allowanceMonthly: Number(raw.allowanceMonthly),
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private mapVerification(raw: any): ClientAttendanceVerificationDTO {
    return {
      id: raw.id,
      attendanceId: raw.attendanceId,
      employeeId: raw.employeeId,
      clientId: raw.clientId,
      deploymentId: raw.deploymentId,
      supervisorId: raw.supervisorId || undefined,
      date: raw.date ? raw.date.toISOString().split('T')[0] : '',
      periodKey: raw.periodKey,
      workingHours: Number(raw.workingHours),
      workMode: raw.workMode,
      notes: raw.notes || undefined,
      clientVerificationStatus: raw.clientVerificationStatus,
      clientVerifiedAt: raw.clientVerifiedAt ? raw.clientVerifiedAt.toISOString() : undefined,
      clientVerifiedBy: raw.clientVerifiedBy || undefined,
      disputeDetails: raw.disputeDetails || undefined,
      companyApprovalStatus: raw.companyApprovalStatus,
      companyApprovedAt: raw.companyApprovedAt ? raw.companyApprovedAt.toISOString() : undefined,
      companyApprovedBy: raw.companyApprovedBy || undefined,
      companyComments: raw.companyComments || undefined,
      payrollEligibilityStatus: raw.payrollEligibilityStatus,
      approvalHistory: raw.approvalHistory || [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

