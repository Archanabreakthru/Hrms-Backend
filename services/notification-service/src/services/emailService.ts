import nodemailer, { Transporter } from 'nodemailer';
import { notificationConfig } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ActivationEmailData {
  recipientEmail: string;
  employeeName: string;
  employeeId: string;
  companyName?: string;
  activationToken: string;
  expiryHours?: number;
}

export interface ClientSupervisorEmailData {
  recipientEmail: string;
  supervisorName: string;
  clientName: string;
  activationToken: string;
  portalUrl?: string;
  expiryHours?: number;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor(customTransporter?: Transporter) {
    if (customTransporter) {
      this.transporter = customTransporter;
    } else {
      this.initTransporter();
    }
  }

  private initTransporter(): void {
    const service = (process.env.SMTP_SERVICE || process.env.MAIL_SERVICE || '').toLowerCase().trim();
    const host = process.env.SMTP_HOST || notificationConfig.mail.host;
    const port = parseInt(process.env.SMTP_PORT || String(notificationConfig.mail.port), 10);
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || notificationConfig.mail.user;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || notificationConfig.mail.pass;
    const secure = process.env.SMTP_SECURE === 'true' || notificationConfig.mail.secure;

    if (user && pass) {
      if (service === 'gmail' || (!host && user.includes('@gmail.com')) || host.includes('gmail.com')) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
        });
      } else if (
        service === 'outlook' ||
        service === 'office365' ||
        service === 'microsoft' ||
        host.includes('outlook') ||
        host.includes('office365') ||
        user.includes('@outlook.com') ||
        user.includes('@hotmail.com')
      ) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: { user, pass },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
        });
      }
    } else {
      // In development / testing without active SMTP creds, use JSON transporter with clear audit logging
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async verifyConnection(): Promise<{ connected: boolean; provider: string; error?: string }> {
    if (!this.transporter) {
      return { connected: false, provider: 'none', error: 'Transporter not initialized' };
    }
    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || notificationConfig.mail.user;
    if (!user) {
      return {
        connected: false,
        provider: 'Google Gmail SMTP (Unconfigured)',
        error: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS (16-char Google App Password) in Hrms-Backend/.env',
      };
    }
    try {
      await this.transporter.verify();
      let providerName = 'Custom SMTP';
      if (user.includes('@gmail.com') || process.env.SMTP_SERVICE === 'gmail') {
        providerName = 'Google Gmail SMTP';
      } else if (user.includes('outlook') || user.includes('office')) {
        providerName = 'Microsoft Outlook/365';
      }
      return { connected: true, provider: providerName };
    } catch (err: any) {
      return { connected: false, provider: 'SMTP', error: err.message };
    }
  }

  /**
   * Generates a responsive, enterprise HTML email for employee account activation.
   * Plaintext passwords are NEVER included.
   */
  generateActivationEmailHtml(data: ActivationEmailData): string {
    const company = data.companyName || notificationConfig.companyName;
    const portalUrl = notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${company}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    .header { background-color: #4f46e5; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .details { background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 16px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .details-row:last-child { margin-bottom: 0; }
    .label { color: #94a3b8; }
    .value { color: #f8fafc; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background-color: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; }
    .notice { font-size: 12px; color: #94a3b8; margin-top: 24px; padding: 12px; background-color: #0f172a; border-left: 3px solid #f59e0b; border-radius: 4px; }
    .footer { border-top: 1px solid #334155; padding: 20px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${company} &bull; Workforce Portal</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello <strong>${data.employeeName}</strong>,</div>
      <p>Welcome to <strong>${company}</strong>! Your official employee record has been registered in the HRMS platform. Please activate your account to configure your password and access your workforce profile, attendance, leaves, and services.</p>
      
      <div class="details">
        <div class="details-row"><span class="label">Employee Name:</span><span class="value">${data.employeeName}</span></div>
        <div class="details-row"><span class="label">Employee ID:</span><span class="value">${data.employeeId}</span></div>
        <div class="details-row"><span class="label">Official Email / Username:</span><span class="value">${data.recipientEmail}</span></div>
        <div class="details-row"><span class="label">HRMS Portal Login URL:</span><span class="value"><a href="${portalUrl}" style="color: #818cf8; text-decoration: underline;">${portalUrl}</a></span></div>
      </div>

      <div class="btn-container">
        <a href="${activationLink}" class="btn">Activate Your HRMS Account</a>
      </div>

      <div class="notice">
        <strong>Instructions for Activating Your Account:</strong>
        <ol style="margin: 8px 0 0 16px; padding: 0;">
          <li>Click the <strong>Activate Your HRMS Account</strong> button above or navigate to the link provided (if an ngrok verification screen appears, click <strong>Visit Site</strong> to proceed).</li>
          <li>Set a secure password meeting enterprise security standards (minimum 8 characters with uppercase, lowercase, and numbers).</li>
          <li>Once submitted, your account will be activated and you will be redirected to the HRMS Portal login.</li>
        </ol>
        <p style="margin-top: 8px; margin-bottom: 0;"><strong>Security Notice:</strong> This activation link is single-use and will expire in ${expiry} hours. If you did not expect this invitation or require assistance, please contact your HR Administration immediately.</p>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${company}. All rights reserved. Secure access to your workforce operating system.
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generates a responsive, enterprise HTML email for Client Supervisor onboarding.
   */
  generateClientSupervisorWelcomeEmailHtml(data: ClientSupervisorEmailData): string {
    const portalUrl = data.portalUrl || notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Client Portal - ${data.clientName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    .header { background-color: #0284c7; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .details { background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 16px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .details-row:last-child { margin-bottom: 0; }
    .label { color: #94a3b8; }
    .value { color: #f8fafc; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { background-color: #0284c7; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; }
    .notice { font-size: 12px; color: #94a3b8; margin-top: 24px; padding: 12px; background-color: #0f172a; border-left: 3px solid #f59e0b; border-radius: 4px; }
    .footer { border-top: 1px solid #334155; padding: 20px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Celestial Client Portal &bull; ${data.clientName}</h1>
    </div>
    <div class="content">
      <div class="greeting">Dear <strong>${data.supervisorName}</strong>,</div>
      <p>You have been registered as an authorized Client Supervisor for <strong>${data.clientName}</strong> on the Celestial Client Portal. Through this portal, you can securely review assigned team deployments, verify employee attendance records, and manage billing authorizations.</p>
      
      <div class="details">
        <div class="details-row"><span class="label">Supervisor Name:</span><span class="value">${data.supervisorName}</span></div>
        <div class="details-row"><span class="label">Client Organization:</span><span class="value">${data.clientName}</span></div>
        <div class="details-row"><span class="label">Registered Email / Username:</span><span class="value">${data.recipientEmail}</span></div>
        <div class="details-row"><span class="label">Client Portal URL:</span><span class="value">${portalUrl}</span></div>
      </div>

      <div class="btn-container">
        <a href="${activationLink}" class="btn">Set Up Password & Access Client Portal</a>
      </div>

      <div class="notice">
        <strong>Important Security Notice:</strong> This activation link is single-use and will expire in ${expiry} hours. Internal HR administration functions remain restricted to ensure organizational data confidentiality.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Celestial Technologies. Client Portal Authorization & Access Control.
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generates a plain-text email alternative for high deliverability across Microsoft Outlook,
   * mobile clients, and corporate spam filters.
   */
  generateActivationEmailPlainText(data: ActivationEmailData): string {
    const company = data.companyName || notificationConfig.companyName;
    const portalUrl = notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `Hello ${data.employeeName},

Welcome to ${company}! Your official employee record has been registered in the HRMS platform.

Your Account Details:
------------------------------------------
Employee Name: ${data.employeeName}
Employee ID: ${data.employeeId}
Official Email / Username: ${data.recipientEmail}
Portal URL: ${portalUrl}
------------------------------------------

To complete your onboarding, configure your password, and access your workforce profile, attendance, leaves, and services, please activate your account using the single-use link below (if prompted with an ngrok verification screen, click 'Visit Site' to proceed):

${activationLink}

Important Security Notice:
This activation link is single-use and will expire in ${expiry} hours. If you did not expect this invitation or require assistance, please contact your HR Administration immediately.

© ${new Date().getFullYear()} ${company}. All rights reserved.`;
  }

  /**
   * Generates a plain-text email alternative for Client Supervisor onboarding.
   */
  generateClientSupervisorWelcomeEmailPlainText(data: ClientSupervisorEmailData): string {
    const portalUrl = data.portalUrl || notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `Dear ${data.supervisorName},

You have been registered as an authorized Client Supervisor for ${data.clientName} on the Celestial Client Portal.

Account Details:
------------------------------------------
Supervisor Name: ${data.supervisorName}
Client Organization: ${data.clientName}
Registered Email / Username: ${data.recipientEmail}
Client Portal URL: ${portalUrl}
------------------------------------------

To set up your password and access the Client Portal to review assigned team deployments, verify employee attendance records, and manage billing authorizations, please click the link below:

${activationLink}

Important Security Notice:
This activation link is single-use and will expire in ${expiry} hours. Internal HR administration functions remain restricted to ensure organizational data confidentiality.

© ${new Date().getFullYear()} Celestial Technologies. Client Portal Authorization & Access Control.`;
  }

  async sendActivationEmail(data: ActivationEmailData): Promise<{ messageId: string; accepted: boolean }> {
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }

    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || notificationConfig.mail.user;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || notificationConfig.mail.pass;
    if (!user || !pass) {
      throw new Error(
        'Outgoing email delivery blocked: Google Gmail SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS (16-char App Password) in Hrms-Backend/.env.'
      );
    }

    const company = data.companyName || notificationConfig.companyName;
    const subject = `Welcome to ${company} – Your HRMS Account Is Ready`;
    const html = this.generateActivationEmailHtml(data);
    const text = this.generateActivationEmailPlainText(data);

    const fromAddress =
      process.env.MAIL_FROM_ADDRESS && !process.env.MAIL_FROM_ADDRESS.includes('noreply@celestial-hrms.com')
        ? process.env.MAIL_FROM_ADDRESS
        : user;
    const fromName = process.env.MAIL_FROM_NAME || notificationConfig.mail.fromName;
    const fromHeader = `"${fromName}" <${fromAddress}>`;

    const info = await this.transporter.sendMail({
      from: fromHeader,
      to: data.recipientEmail,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
      },
    });

    const isAccepted = Array.isArray(info.accepted) ? info.accepted.length > 0 : true;
    return {
      messageId: info.messageId || 'sent-msg-id',
      accepted: isAccepted,
    };
  }

  async sendClientSupervisorWelcomeEmail(data: ClientSupervisorEmailData): Promise<{ messageId: string; accepted: boolean }> {
    if (!this.transporter) {
      throw new Error('Email transporter is not initialized');
    }

    const user = process.env.SMTP_USER || process.env.MAIL_USERNAME || notificationConfig.mail.user;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || notificationConfig.mail.pass;
    if (!user || !pass) {
      throw new Error(
        'Outgoing email delivery blocked: Google Gmail SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS (16-char App Password) in Hrms-Backend/.env.'
      );
    }

    const subject = `Welcome to Celestial Client Portal – Access for ${data.clientName}`;
    const html = this.generateClientSupervisorWelcomeEmailHtml(data);
    const text = this.generateClientSupervisorWelcomeEmailPlainText(data);

    const fromAddress =
      process.env.MAIL_FROM_ADDRESS && !process.env.MAIL_FROM_ADDRESS.includes('noreply@celestial-hrms.com')
        ? process.env.MAIL_FROM_ADDRESS
        : user;
    const fromName = process.env.MAIL_FROM_NAME || notificationConfig.mail.fromName;
    const fromHeader = `"${fromName}" <${fromAddress}>`;

    const info = await this.transporter.sendMail({
      from: fromHeader,
      to: data.recipientEmail,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'high',
      },
    });

    const isAccepted = Array.isArray(info.accepted) ? info.accepted.length > 0 : true;
    return {
      messageId: info.messageId || 'sent-msg-id',
      accepted: isAccepted,
    };
  }
}
