import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

export interface DispatcherConfig {
  authServiceUrl: string;
  notificationServiceUrl?: string;
  internalServiceSecret: string;
  pollIntervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
}

export class OutboxDispatcher {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxAttempts: number;

  constructor(
    private prisma: PrismaClient,
    private config: DispatcherConfig
  ) {
    this.pollIntervalMs = config.pollIntervalMs || 5000;
    this.batchSize = config.batchSize || 10;
    this.maxAttempts = config.maxAttempts || 5;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      await this.processBatch();
      this.scheduleNext();
    }, this.pollIntervalMs);
  }

  /**
   * Processes a single batch of pending/retry outbox items.
   */
  async processBatch(): Promise<number> {
    try {
      const now = new Date();
      const items = await (this.prisma as any).provisioningOutbox.findMany({
        where: {
          status: { in: ['PENDING', 'RETRY'] },
          nextRetryAt: { lte: now },
        },
        take: this.batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (!items || items.length === 0) return 0;

      for (const item of items) {
        await this.dispatchItem(item);
      }

      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Dispatches a single outbox record with HMAC canonical request signing.
   */
  async dispatchItem(item: any): Promise<boolean> {
    const payload = item.payload;
    const bodyString = JSON.stringify(payload);
    const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');

    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();
    const idempotencyKey = item.id;
    const method = 'POST';
    const path = '/api/v1/auth/provision';

    const canonicalString = `${method}\n${path}\n${timestamp}\n${nonce}\n${idempotencyKey}\n${bodyHash}`;
    const signature = crypto
      .createHmac('sha256', this.config.internalServiceSecret)
      .update(canonicalString)
      .digest('hex');

    try {
      const url = `${this.config.authServiceUrl}${path}`;
      const res = await fetch(url, {
        method,
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

      if (res.ok || res.status === 201 || res.status === 200) {
        const provData = await res.json();
        const rawToken = provData?.data?.activationToken;
        const newUserId = provData?.data?.user?.id;

        // Securely link newly provisioned Auth User ID to Employee Record
        if (newUserId) {
          try {
            await (this.prisma as any).employee.update({
              where: { id: item.employeeId },
              data: { userId: newUserId },
            });
          } catch {
            // Safe fallback if already linked
          }
        }

        // Secure handoff: If an activationToken was generated, trigger the welcome email via Notification Service
        if (rawToken && this.config.notificationServiceUrl) {
          try {
            await fetch(`${this.config.notificationServiceUrl}/api/v1/notifications/dispatch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientId: item.email,
                title: 'Welcome to Breakthru Enterprise Solution - Your HRMS Account Is Ready',
                message: 'Your official HRMS account has been provisioned. Please activate your account within 24 hours.',
                channel: 'EMAIL',
                metadata: {
                  recipientEmail: item.email,
                  employeeName: `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || item.employeeId,
                  employeeId: item.employeeId,
                  companyName: 'Breakthru Enterprise Solution',
                  activationToken: rawToken,
                },
              }),
            });
          } catch {
            // Outbox marked completed for account creation; email retry can be triggered via resend
          }
        }

        await (this.prisma as any).provisioningOutbox.update({
          where: { id: item.id },
          data: {
            status: 'COMPLETED',
            lastError: null,
            updatedAt: new Date(),
          },
        });
        return true;
      }

      const errText = await res.text();
      await this.handleFailure(item, `HTTP ${res.status}: ${errText}`);
      return false;
    } catch (err: any) {
      await this.handleFailure(item, err.message || 'Network connection failed');
      return false;
    }
  }

  private async handleFailure(item: any, errorMsg: string): Promise<void> {
    const nextAttempts = item.attempts + 1;
    const isExhausted = nextAttempts >= this.maxAttempts;

    // Exponential backoff: 5s, 20s, 60s, 300s...
    const backoffSeconds = Math.min(300, Math.pow(2, nextAttempts) * 5);
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

    await (this.prisma as any).provisioningOutbox.update({
      where: { id: item.id },
      data: {
        status: isExhausted ? 'FAILED' : 'RETRY',
        attempts: nextAttempts,
        lastError: errorMsg.substring(0, 500),
        nextRetryAt: isExhausted ? new Date() : nextRetryAt,
        updatedAt: new Date(),
      },
    });
  }
}

