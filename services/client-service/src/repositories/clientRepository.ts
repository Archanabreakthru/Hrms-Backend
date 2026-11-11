export interface ClientOrgDTO {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractStart?: string;
  contractEnd?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientSupervisorDTO {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  status: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientDeploymentDTO {
  id: string;
  clientId: string;
  employeeId: string;
  supervisorId?: string;
  project: string;
  location: string;
  workMode: string;
  startDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  allocation: number;
  allowanceMonthly: number;
  status: 'Active' | 'Completed' | 'Terminated' | 'On_Hold';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientAttendanceVerificationDTO {
  id: string;
  attendanceId: string; // Authoritative Attendance Service ID
  employeeId: string;
  clientId: string;
  deploymentId: string;
  supervisorId?: string;
  date: string;
  periodKey: string; // "YYYY-MM-P1", "YYYY-MM-P2", "YYYY-MM-M1"
  workingHours: number;
  workMode: string;
  notes?: string;
  clientVerificationStatus:
    | 'Submitted'
    | 'Pending_Client_Verification'
    | 'Client_Approved'
    | 'Client_Rejected'
    | 'Pending_HR_Verification'
    | 'HR_Approved'
    | 'HR_Rejected';
  clientVerifiedAt?: string;
  clientVerifiedBy?: string;
  disputeDetails?: string;
  companyApprovalStatus: string;
  companyApprovedAt?: string;
  companyApprovedBy?: string;
  companyComments?: string;
  payrollEligibilityStatus: 'Not_Eligible' | 'Eligible' | 'Disputed';
  approvalHistory?: Array<{
    stage: string;
    actorId: string;
    actorName: string;
    action: string;
    timestamp: string;
    comments?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientRepository {
  findClientById(id: string): Promise<ClientOrgDTO | null>;
  listClients(): Promise<ClientOrgDTO[]>;
  saveClient(client: ClientOrgDTO): Promise<ClientOrgDTO>;

  findSupervisorById(id: string): Promise<ClientSupervisorDTO | null>;
  findSupervisorByUserId(userId: string): Promise<ClientSupervisorDTO | null>;
  listSupervisors(clientId?: string): Promise<ClientSupervisorDTO[]>;
  saveSupervisor(sup: ClientSupervisorDTO): Promise<ClientSupervisorDTO>;

  findDeploymentById(id: string): Promise<ClientDeploymentDTO | null>;
  findActiveDeploymentForDate(employeeId: string, date: string): Promise<ClientDeploymentDTO | null>;
  listDeployments(filter: { clientId?: string; employeeId?: string; status?: string }): Promise<ClientDeploymentDTO[]>;
  saveDeployment(dep: ClientDeploymentDTO): Promise<ClientDeploymentDTO>;

  findVerificationById(id: string): Promise<ClientAttendanceVerificationDTO | null>;
  findVerificationByAttendanceId(attendanceId: string): Promise<ClientAttendanceVerificationDTO | null>;
  listVerifications(filter: { clientId?: string; employeeId?: string; periodKey?: string; status?: string }): Promise<ClientAttendanceVerificationDTO[]>;
  saveVerification(verif: ClientAttendanceVerificationDTO): Promise<ClientAttendanceVerificationDTO>;
}

export class InMemoryClientRepository implements IClientRepository {
  private clients = new Map<string, ClientOrgDTO>();
  private supervisors = new Map<string, ClientSupervisorDTO>();
  private deployments = new Map<string, ClientDeploymentDTO>();
  private verifications = new Map<string, ClientAttendanceVerificationDTO>();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date();
    const c1: ClientOrgDTO = {
      id: 'CLI-001',
      name: 'Apex Fintech Solutions',
      contactName: 'Vikram Rao',
      email: 'v.rao@apexfintech.example.com',
      phone: '+91 80 4112 7300',
      address: 'Manyata Tech Park, Bangalore',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };
    this.clients.set(c1.id, c1);

    const sup1: ClientSupervisorDTO = {
      id: 'SUP-001',
      clientId: 'CLI-001',
      fullName: 'Vikram Rao',
      email: 'v.rao@apexfintech.example.com',
      phone: '+91 80 4112 7301',
      designation: 'VP Engineering',
      status: 'Active',
      userId: 'usr-sup-1',
      createdAt: now,
      updatedAt: now,
    };
    this.supervisors.set(sup1.id, sup1);
    this.supervisors.set(sup1.userId!, sup1);

    const dep1: ClientDeploymentDTO = {
      id: 'DEP-CLI-001',
      clientId: 'CLI-001',
      employeeId: 'EMP-SWE-0001',
      supervisorId: 'SUP-001',
      project: 'Core Banking Modernization',
      location: 'Manyata Tech Park',
      workMode: 'Client Site',
      startDate: '2026-01-01',
      plannedEndDate: '2026-12-31',
      allocation: 100,
      allowanceMonthly: 5000,
      status: 'Active',
      createdAt: now,
      updatedAt: now,
    };
    this.deployments.set(dep1.id, dep1);
  }

  async findClientById(id: string): Promise<ClientOrgDTO | null> {
    return this.clients.get(id) || null;
  }

  async listClients(): Promise<ClientOrgDTO[]> {
    return Array.from(this.clients.values());
  }

  async saveClient(client: ClientOrgDTO): Promise<ClientOrgDTO> {
    this.clients.set(client.id, { ...client });
    return client;
  }

  async findSupervisorById(id: string): Promise<ClientSupervisorDTO | null> {
    return this.supervisors.get(id) || null;
  }

  async findSupervisorByUserId(userId: string): Promise<ClientSupervisorDTO | null> {
    for (const s of this.supervisors.values()) {
      if (s.userId === userId) return s;
    }
    return null;
  }

  async listSupervisors(clientId?: string): Promise<ClientSupervisorDTO[]> {
    let list = Array.from(new Set(this.supervisors.values()));
    if (clientId) list = list.filter((s) => s.clientId === clientId);
    return list;
  }

  async saveSupervisor(sup: ClientSupervisorDTO): Promise<ClientSupervisorDTO> {
    this.supervisors.set(sup.id, { ...sup });
    if (sup.userId) this.supervisors.set(sup.userId, { ...sup });
    return sup;
  }

  async findDeploymentById(id: string): Promise<ClientDeploymentDTO | null> {
    return this.deployments.get(id) || null;
  }

  async findActiveDeploymentForDate(employeeId: string, date: string): Promise<ClientDeploymentDTO | null> {
    for (const d of this.deployments.values()) {
      if (
        d.employeeId === employeeId &&
        d.status === 'Active' &&
        d.startDate <= date &&
        d.plannedEndDate >= date
      ) {
        return d;
      }
    }
    return null;
  }

  async listDeployments(filter: { clientId?: string; employeeId?: string; status?: string }): Promise<ClientDeploymentDTO[]> {
    let list = Array.from(this.deployments.values());
    if (filter.clientId) list = list.filter((d) => d.clientId === filter.clientId);
    if (filter.employeeId) list = list.filter((d) => d.employeeId === filter.employeeId);
    if (filter.status) list = list.filter((d) => d.status === filter.status);
    return list;
  }

  async saveDeployment(dep: ClientDeploymentDTO): Promise<ClientDeploymentDTO> {
    this.deployments.set(dep.id, { ...dep });
    return dep;
  }

  async findVerificationById(id: string): Promise<ClientAttendanceVerificationDTO | null> {
    return this.verifications.get(id) || null;
  }

  async findVerificationByAttendanceId(attendanceId: string): Promise<ClientAttendanceVerificationDTO | null> {
    for (const v of this.verifications.values()) {
      if (v.attendanceId === attendanceId) return v;
    }
    return null;
  }

  async listVerifications(filter: { clientId?: string; employeeId?: string; periodKey?: string; status?: string }): Promise<ClientAttendanceVerificationDTO[]> {
    let list = Array.from(this.verifications.values());
    if (filter.clientId) list = list.filter((v) => v.clientId === filter.clientId);
    if (filter.employeeId) list = list.filter((v) => v.employeeId === filter.employeeId);
    if (filter.periodKey) list = list.filter((v) => v.periodKey === filter.periodKey);
    if (filter.status) list = list.filter((v) => v.clientVerificationStatus === filter.status);
    return list;
  }

  async saveVerification(verif: ClientAttendanceVerificationDTO): Promise<ClientAttendanceVerificationDTO> {
    this.verifications.set(verif.id, { ...verif });
    return verif;
  }
}

