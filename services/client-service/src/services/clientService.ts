import {
  IClientRepository,
  ClientOrgDTO,
  ClientDeploymentDTO,
  ClientAttendanceVerificationDTO,
} from '../repositories/clientRepository';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../../../shared/src/errors/AppError';
import { AuthenticatedUser } from '../../../../shared/src/contracts/auth';
import { UserRole } from '../../../../shared/src/constants/roles';
import { EventPublisher, createEvent } from '../../../../shared/src/infrastructure/messaging';

export class ClientService {
  constructor(
    private clientRepo: IClientRepository,
    private eventBus?: EventPublisher
  ) {}

  /**
   * Helper: Calculates period key (15-day / 30-day cycle)
   */
  static getPeriodKey(dateStr: string, mode: '15_day' | '30_day' = '15_day'): string {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = d.getDate();

    if (mode === '30_day') {
      return `${year}-${month}-M1`;
    }
    return day <= 15 ? `${year}-${month}-P1` : `${year}-${month}-P2`;
  }

  /**
   * Ingest Attendance Punch Event from Attendance Service (Step 1 & 2)
   * Client Service references attendanceId without duplicating attendance records.
   */
  async handleAttendancePunchedEvent(event: {
    attendanceId: string;
    employeeId: string;
    date: string;
    workMode: string;
    workingHours?: number;
    status?: string;
  }): Promise<ClientAttendanceVerificationDTO | null> {
    // 1. Evaluate deployment eligibility on exact attendance date
    const deployment = await this.clientRepo.findActiveDeploymentForDate(event.employeeId, event.date);
    if (!deployment || deployment.status !== 'Active') {
      return null; // Not deployed to a client on this date
    }

    const existing = await this.clientRepo.findVerificationByAttendanceId(event.attendanceId);
    const periodKey = ClientService.getPeriodKey(event.date, '15_day');
    const now = new Date();

    if (existing) {
      // Update hours if clocked out
      existing.workingHours = event.workingHours || existing.workingHours;
      existing.updatedAt = now;
      return this.clientRepo.saveVerification(existing);
    }

    const verif: ClientAttendanceVerificationDTO = {
      id: `VERIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  /**
   * Client Supervisor Verification (Step 3)
   * External supervisor tenant-isolated by clientId.
   */
  async supervisorVerify(
    verificationId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string | undefined,
    actor: AuthenticatedUser
  ): Promise<ClientAttendanceVerificationDTO> {
    const verif = await this.clientRepo.findVerificationById(verificationId);
    if (!verif) throw new NotFoundError(`Verification record ${verificationId} not found`);

    // Strict tenant isolation: Supervisor can only act on records matching their clientId
    if (actor.role === UserRole.CLIENT_SUPERVISOR && actor.clientId !== verif.clientId) {
      throw new ForbiddenError('Tenant isolation violation: Access denied to other client records');
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

  /**
   * HR Dual-Approval & Dispute Resolution (Step 4 & 5)
   * Transitions status to HR_Approved and marks Eligible for Payroll.
   */
  async hrResolveAndApprove(
    verificationId: string,
    decision: 'Approved' | 'Rejected',
    hrComments: string | undefined,
    actor: AuthenticatedUser
  ): Promise<ClientAttendanceVerificationDTO> {
    if (actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Only company HR Administrators can issue final attendance approvals');
    }

    const verif = await this.clientRepo.findVerificationById(verificationId);
    if (!verif) throw new NotFoundError(`Verification record ${verificationId} not found`);

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

    // Step 5: Publish Event to inform Payroll Service
    if (this.eventBus && decision === 'Approved') {
      await this.eventBus.publish(
        'client.attendance.verified',
        createEvent('CLIENT_ATTENDANCE_VERIFIED', saved.id, 'ClientVerification', {
          verificationId: saved.id,
          attendanceId: saved.attendanceId,
          employeeId: saved.employeeId,
          clientId: saved.clientId,
          verifiedHours: saved.workingHours,
          payrollEligibilityStatus: 'Eligible',
        })
      );
    }

    return saved;
  }

  /**
   * Internal Payroll Service Query for Verified Client Hours & Onsite Allowances
   */
  async getVerifiedHoursAndAllowancesForPayroll(
    employeeId: string,
    periodKey: string
  ): Promise<{
    verifiedHours: number;
    allowanceMonthly: number;
    isEligible: boolean;
  }> {
    const list = await this.clientRepo.listVerifications({ employeeId, periodKey });
    let verifiedHours = 0;
    let isEligible = list.length > 0;

    for (const v of list) {
      if (v.payrollEligibilityStatus === 'Eligible') {
        verifiedHours += v.workingHours;
      } else {
        isEligible = false;
      }
    }

    // Query deployment allowance
    const deployments = await this.clientRepo.listDeployments({ employeeId, status: 'Active' });
    const allowance = deployments.length > 0 ? deployments[0].allowanceMonthly : 0;

    return {
      verifiedHours: Math.round(verifiedHours * 100) / 100,
      allowanceMonthly: allowance,
      isEligible,
    };
  }
}

