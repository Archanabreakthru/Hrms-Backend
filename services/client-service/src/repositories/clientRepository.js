"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryClientRepository = void 0;
class InMemoryClientRepository {
    clients = new Map();
    supervisors = new Map();
    deployments = new Map();
    verifications = new Map();
    constructor() {
        this.seedDefaults();
    }
    seedDefaults() {
        const now = new Date();
        const c1 = {
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
        const sup1 = {
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
        this.supervisors.set(sup1.userId, sup1);
        const dep1 = {
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
    async findClientById(id) {
        return this.clients.get(id) || null;
    }
    async listClients() {
        return Array.from(this.clients.values());
    }
    async saveClient(client) {
        this.clients.set(client.id, { ...client });
        return client;
    }
    async findSupervisorById(id) {
        return this.supervisors.get(id) || null;
    }
    async findSupervisorByUserId(userId) {
        for (const s of this.supervisors.values()) {
            if (s.userId === userId)
                return s;
        }
        return null;
    }
    async listSupervisors(clientId) {
        let list = Array.from(new Set(this.supervisors.values()));
        if (clientId)
            list = list.filter((s) => s.clientId === clientId);
        return list;
    }
    async saveSupervisor(sup) {
        this.supervisors.set(sup.id, { ...sup });
        if (sup.userId)
            this.supervisors.set(sup.userId, { ...sup });
        return sup;
    }
    async findDeploymentById(id) {
        return this.deployments.get(id) || null;
    }
    async findActiveDeploymentForDate(employeeId, date) {
        for (const d of this.deployments.values()) {
            if (d.employeeId === employeeId &&
                d.status === 'Active' &&
                d.startDate <= date &&
                d.plannedEndDate >= date) {
                return d;
            }
        }
        return null;
    }
    async listDeployments(filter) {
        let list = Array.from(this.deployments.values());
        if (filter.clientId)
            list = list.filter((d) => d.clientId === filter.clientId);
        if (filter.employeeId)
            list = list.filter((d) => d.employeeId === filter.employeeId);
        if (filter.status)
            list = list.filter((d) => d.status === filter.status);
        return list;
    }
    async saveDeployment(dep) {
        this.deployments.set(dep.id, { ...dep });
        return dep;
    }
    async findVerificationById(id) {
        return this.verifications.get(id) || null;
    }
    async findVerificationByAttendanceId(attendanceId) {
        for (const v of this.verifications.values()) {
            if (v.attendanceId === attendanceId)
                return v;
        }
        return null;
    }
    async listVerifications(filter) {
        let list = Array.from(this.verifications.values());
        if (filter.clientId)
            list = list.filter((v) => v.clientId === filter.clientId);
        if (filter.employeeId)
            list = list.filter((v) => v.employeeId === filter.employeeId);
        if (filter.periodKey)
            list = list.filter((v) => v.periodKey === filter.periodKey);
        if (filter.status)
            list = list.filter((v) => v.clientVerificationStatus === filter.status);
        return list;
    }
    async saveVerification(verif) {
        this.verifications.set(verif.id, { ...verif });
        return verif;
    }
}
exports.InMemoryClientRepository = InMemoryClientRepository;
