"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const roles_1 = require("../../../../shared/src/constants/roles");
const messaging_1 = require("../../../../shared/src/infrastructure/messaging");
const crypto_1 = __importStar(require("crypto"));
class ClientService {
    clientRepo;
    eventBus;
    constructor(clientRepo, eventBus) {
        this.clientRepo = clientRepo;
        this.eventBus = eventBus;
    }
    /**
     * Helper: Calculates period key (15-day / 30-day cycle)
     */
    static getPeriodKey(dateStr, mode = '15_day') {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = d.getDate();
        if (mode === '30_day') {
            return `${year}-${month}-M1`;
        }
        return day <= 15 ? `${year}-${month}-P1` : `${year}-${month}-P2`;
    }
    // ==========================================
    // Client Organizations Management
    // ==========================================
    async listClients(status, search) {
        let clients = await this.clientRepo.listClients();
        if (status) {
            clients = clients.filter((c) => c.status.toLowerCase() === status.toLowerCase());
        }
        if (search) {
            const q = search.toLowerCase();
            clients = clients.filter((c) => c.name.toLowerCase().includes(q) ||
                c.contactName?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q));
        }
        return clients;
    }
    async getClientById(id) {
        const client = await this.clientRepo.findClientById(id);
        if (!client) {
            throw new AppError_1.NotFoundError(`Client organization ${id} not found`);
        }
        return client;
    }
    async createClient(data) {
        const now = new Date();
        const newClient = {
            id: (0, crypto_1.randomUUID)(),
            name: data.name,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            contractStart: data.contractStart,
            contractEnd: data.contractEnd,
            status: data.status || 'Active',
            createdAt: now,
            updatedAt: now,
        };
        return this.clientRepo.saveClient(newClient);
    }
    async updateClient(id, updates) {
        const existing = await this.clientRepo.findClientById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Client organization ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        return this.clientRepo.saveClient(updated);
    }
    // ==========================================
    // Client Supervisors Management
    // ==========================================
    async listSupervisors(clientId, actor) {
        let effectiveClientId = clientId;
        if (actor && actor.role === roles_1.UserRole.CLIENT_SUPERVISOR) {
            effectiveClientId = actor.clientId;
        }
        return this.clientRepo.listSupervisors(effectiveClientId);
    }
    async createSupervisor(data) {
        const client = await this.clientRepo.findClientById(data.clientId);
        if (!client) {
            throw new AppError_1.NotFoundError(`Client organization ${data.clientId} not found`);
        }
        const now = new Date();
        const supervisor = {
            id: (0, crypto_1.randomUUID)(),
            clientId: data.clientId,
            fullName: data.fullName,
            email: data.email.toLowerCase().trim(),
            phone: data.phone,
            designation: data.designation,
            status: data.status || 'Active',
            userId: data.userId,
            createdAt: now,
            updatedAt: now,
        };
        // Automated Client Supervisor Onboarding: create account in auth-service & send welcome email
        if (supervisor.email) {
            try {
                const body = {
                    employeeId: `SUP-${supervisor.id.substring(0, 8).toUpperCase()}`,
                    email: supervisor.email,
                    firstName: data.fullName.split(' ')[0] || data.fullName,
                    lastName: data.fullName.split(' ').slice(1).join(' ') || '',
                    roleCode: roles_1.UserRole.CLIENT_SUPERVISOR,
                    clientId: data.clientId,
                };
                const bodyString = JSON.stringify(body);
                const bodyHash = crypto_1.default.createHash('sha256').update(bodyString).digest('hex');
                const timestamp = new Date().toISOString();
                const nonce = (0, crypto_1.randomUUID)();
                const idempotencyKey = supervisor.id;
                const secret = process.env.INTERNAL_SERVICE_SECRET || 'supersecret_jwt_key_replace_in_production';
                const canonical = `POST\n/api/v1/auth/provision\n${timestamp}\n${nonce}\n${idempotencyKey}\n${bodyHash}`;
                const signature = crypto_1.default.createHmac('sha256', secret).update(canonical).digest('hex');
                const authUrl = `${process.env.AUTH_SERVICE_URL || 'http://localhost:5001'}/api/v1/auth/provision`;
                const authRes = await fetch(authUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Service-Name': 'employee-service',
                        'X-Service-Timestamp': timestamp,
                        'X-Service-Nonce': nonce,
                        'X-Idempotency-Key': idempotencyKey,
                        'X-Service-Signature': signature,
                    },
                    body: bodyString,
                });
                if (authRes.ok) {
                    const authData = await authRes.json();
                    const token = authData?.data?.activationToken;
                    const user = authData?.data?.user;
                    if (user?.id) {
                        supervisor.userId = user.id;
                    }
                    // Trigger automated client supervisor welcome email
                    if (token) {
                        const notifUrl = `${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008'}/api/v1/notifications/dispatch`;
                        await fetch(notifUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                recipientId: supervisor.email,
                                title: `Welcome to Breakthru Enterprise Solution Client Portal - Access for ${client.name}`,
                                message: `You have been registered as an authorized Client Supervisor for ${client.name}. Please complete password setup.`,
                                channel: 'EMAIL',
                                metadata: {
                                    recipientEmail: supervisor.email,
                                    supervisorName: supervisor.fullName,
                                    clientName: client.name,
                                    companyName: 'Breakthru Enterprise Solution',
                                    activationToken: token,
                                },
                            }),
                        }).catch(() => { });
                    }
                }
            }
            catch (err) {
                console.warn('Client supervisor account provisioning warning:', err.message);
            }
        }
        return this.clientRepo.saveSupervisor(supervisor);
    }
    async updateSupervisor(id, updates) {
        const existing = await this.clientRepo.findSupervisorById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Supervisor ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        return this.clientRepo.saveSupervisor(updated);
    }
    // ==========================================
    // Employee Deployments Management
    // ==========================================
    async listDeployments(filter, actor) {
        const effectiveFilter = { ...filter };
        // Strict tenant isolation: Supervisor can only view deployments matching their clientId
        if (actor.role === roles_1.UserRole.CLIENT_SUPERVISOR) {
            if (!actor.clientId) {
                throw new AppError_1.ForbiddenError('Client supervisor account is not assigned to a client organization');
            }
            effectiveFilter.clientId = actor.clientId;
        }
        return this.clientRepo.listDeployments(effectiveFilter);
    }
    async createDeployment(data, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can deploy employees to client sites');
        }
        const client = await this.clientRepo.findClientById(data.clientId);
        if (!client) {
            throw new AppError_1.NotFoundError(`Client organization ${data.clientId} not found`);
        }
        const now = new Date();
        const deployment = {
            id: (0, crypto_1.randomUUID)(),
            clientId: data.clientId,
            employeeId: data.employeeId,
            supervisorId: data.supervisorId,
            project: data.project,
            location: data.location,
            workMode: data.workMode || 'Client Site',
            startDate: data.startDate,
            plannedEndDate: data.plannedEndDate,
            allocation: data.allocation !== undefined ? data.allocation : 100,
            allowanceMonthly: data.allowanceMonthly !== undefined ? data.allowanceMonthly : 0,
            status: data.status || 'Active',
            createdAt: now,
            updatedAt: now,
        };
        return this.clientRepo.saveDeployment(deployment);
    }
    async updateDeployment(id, updates, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only HR Administrators can modify client deployments');
        }
        const existing = await this.clientRepo.findDeploymentById(id);
        if (!existing) {
            throw new AppError_1.NotFoundError(`Deployment ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        return this.clientRepo.saveDeployment(updated);
    }
    // ==========================================
    // Attendance Verification & Workflow
    // ==========================================
    async listVerifications(filter, actor) {
        const effectiveFilter = { ...filter };
        if (actor.role === roles_1.UserRole.CLIENT_SUPERVISOR) {
            if (!actor.clientId) {
                throw new AppError_1.ForbiddenError('Client supervisor account is not assigned to a client organization');
            }
            effectiveFilter.clientId = actor.clientId;
        }
        return this.clientRepo.listVerifications(effectiveFilter);
    }
    async handleAttendancePunchedEvent(event) {
        const deployment = await this.clientRepo.findActiveDeploymentForDate(event.employeeId, event.date);
        if (!deployment || deployment.status !== 'Active') {
            return null;
        }
        const existing = await this.clientRepo.findVerificationByAttendanceId(event.attendanceId);
        const periodKey = ClientService.getPeriodKey(event.date, '15_day');
        const now = new Date();
        if (existing) {
            existing.workingHours = event.workingHours || existing.workingHours;
            existing.updatedAt = now;
            return this.clientRepo.saveVerification(existing);
        }
        const verif = {
            id: (0, crypto_1.randomUUID)(),
            attendanceId: event.attendanceId,
            employeeId: event.employeeId,
            clientId: deployment.clientId,
            deploymentId: deployment.id,
            supervisorId: deployment.supervisorId,
            date: event.date,
            periodKey,
            workingHours: event.workingHours || 0,
            workMode: event.workMode,
            clientVerificationStatus: 'Pending_Client_Verification',
            companyApprovalStatus: 'Pending',
            payrollEligibilityStatus: 'Not_Eligible',
            approvalHistory: [
                {
                    stage: 'INGESTION',
                    actorId: 'attendance-service',
                    actorName: 'Attendance Service',
                    action: 'PUNCH_INGESTED',
                    timestamp: now.toISOString(),
                },
            ],
            createdAt: now,
            updatedAt: now,
        };
        return this.clientRepo.saveVerification(verif);
    }
    async supervisorVerify(verificationId, decision, remarks, actor) {
        const verif = await this.clientRepo.findVerificationById(verificationId);
        if (!verif)
            throw new AppError_1.NotFoundError(`Verification record ${verificationId} not found`);
        if (actor.role === roles_1.UserRole.CLIENT_SUPERVISOR && actor.clientId !== verif.clientId) {
            throw new AppError_1.ForbiddenError('Tenant isolation violation: Access denied to other client records');
        }
        const now = new Date();
        verif.clientVerificationStatus = decision === 'Approved' ? 'Client_Approved' : 'Client_Rejected';
        verif.clientVerifiedAt = now.toISOString();
        verif.clientVerifiedBy = actor.id;
        if (decision === 'Rejected') {
            verif.disputeDetails = remarks;
            verif.payrollEligibilityStatus = 'Disputed';
        }
        verif.approvalHistory = verif.approvalHistory || [];
        verif.approvalHistory.push({
            stage: 'CLIENT_SUPERVISOR_REVIEW',
            actorId: actor.id,
            actorName: actor.email,
            action: decision === 'Approved' ? 'SUPERVISOR_APPROVED' : 'SUPERVISOR_REJECTED',
            timestamp: now.toISOString(),
            comments: remarks,
        });
        verif.updatedAt = now;
        return this.clientRepo.saveVerification(verif);
    }
    async hrResolveAndApprove(verificationId, decision, hrComments, actor) {
        if (actor.role !== roles_1.UserRole.HR_ADMIN && actor.role !== roles_1.UserRole.SUPER_ADMIN) {
            throw new AppError_1.ForbiddenError('Only company HR Administrators can issue final attendance approvals');
        }
        const verif = await this.clientRepo.findVerificationById(verificationId);
        if (!verif)
            throw new AppError_1.NotFoundError(`Verification record ${verificationId} not found`);
        const now = new Date();
        verif.clientVerificationStatus = decision === 'Approved' ? 'HR_Approved' : 'HR_Rejected';
        verif.companyApprovalStatus = decision === 'Approved' ? 'Approved' : 'Rejected';
        verif.companyApprovedAt = now.toISOString();
        verif.companyApprovedBy = actor.id;
        verif.companyComments = hrComments;
        verif.payrollEligibilityStatus = decision === 'Approved' ? 'Eligible' : 'Not_Eligible';
        verif.approvalHistory = verif.approvalHistory || [];
        verif.approvalHistory.push({
            stage: 'HR_VERIFICATION_AND_PAYROLL_FINALIZATION',
            actorId: actor.id,
            actorName: actor.email,
            action: decision === 'Approved' ? 'HR_DUAL_APPROVED' : 'HR_REJECTED',
            timestamp: now.toISOString(),
            comments: hrComments,
        });
        verif.updatedAt = now;
        const saved = await this.clientRepo.saveVerification(verif);
        if (this.eventBus && decision === 'Approved') {
            await this.eventBus.publish('client.attendance.verified', (0, messaging_1.createEvent)('CLIENT_ATTENDANCE_VERIFIED', saved.id, 'ClientVerification', {
                verificationId: saved.id,
                attendanceId: saved.attendanceId,
                employeeId: saved.employeeId,
                clientId: saved.clientId,
                verifiedHours: saved.workingHours,
                payrollEligibilityStatus: 'Eligible',
            }));
        }
        return saved;
    }
    async getVerifiedHoursAndAllowancesForPayroll(employeeId, periodKey) {
        const verifs = await this.clientRepo.listVerifications({ employeeId, periodKey });
        const eligibleVerifs = verifs.filter((v) => v.payrollEligibilityStatus === 'Eligible');
        const totalVerifiedHours = eligibleVerifs.reduce((sum, v) => sum + v.workingHours, 0);
        let monthlyAllowance = 0;
        if (verifs.length > 0) {
            const dep = await this.clientRepo.findDeploymentById(verifs[0].deploymentId);
            if (dep)
                monthlyAllowance = dep.allowanceMonthly;
        }
        return {
            employeeId,
            periodKey,
            totalVerifiedHours,
            verifiedHours: totalVerifiedHours,
            monthlyAllowance,
            allowanceMonthly: monthlyAllowance,
            eligibleForPayroll: eligibleVerifs.length > 0,
            isEligible: eligibleVerifs.length > 0,
        };
    }
}
exports.ClientService = ClientService;
