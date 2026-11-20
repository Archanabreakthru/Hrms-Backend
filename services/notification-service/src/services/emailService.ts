import os from 'os';
import nodemailer, { Transporter } from 'nodemailer';
import { notificationConfig } from '../config/env';

function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return 'localhost';
}

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
    const localIp = getLocalIp();
    const company = data.companyName || notificationConfig.companyName;
    const portalUrl = notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const localActivationLink = `http://localhost:3000/#activate?token=${data.activationToken}`;
    const wifiActivationLink = localIp !== 'localhost' ? `http://${localIp}:3000/#activate?token=${data.activationToken}` : '';
    const expiry = data.expiryHours || 24;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${company}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff !important; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .content { padding: 32px 28px; line-height: 1.6; background-color: #ffffff; color: #1e293b; }
    .greeting { font-size: 16px; margin-bottom: 16px; color: #0f172a; font-weight: 600; }
    .lead-text { font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { background-color: #2563eb; color: #ffffff !important; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .notice { font-size: 12px; color: #78350f; margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; background-color: #f8fafc; }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div class="card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
    <div class="header" style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); background-color: #2563eb; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff !important; font-size: 22px; font-weight: 700; letter-spacing: -0.01em;">${company} &bull; Workforce Portal</h1>
    </div>
    <div class="content" style="padding: 32px 28px; line-height: 1.6; background-color: #ffffff; color: #1e293b;">
      <div class="greeting" style="font-size: 16px; margin-bottom: 16px; color: #0f172a; font-weight: 600;">Hello ${data.employeeName},</div>
      <p class="lead-text" style="font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6;">Welcome to <strong>${company}</strong>! Your official employee record has been registered in the HRMS platform. Please activate your account to configure your password and access your workforce profile, attendance, leaves, and services.</p>
      
      <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; border-collapse: separate;">
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9; width: 45%;">Employee Name:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.employeeName}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Employee ID:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.employeeId}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Official Email / Username:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.recipientEmail}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500;">HRMS Portal URL:</td>
          <td style="color: #2563eb; font-size: 13px; font-weight: 700; text-align: right;"><a href="${portalUrl}" style="color: #2563eb; text-decoration: underline;">${portalUrl}</a></td>
        </tr>
      </table>

      <div class="btn-container" style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${activationLink}" class="btn" style="background-color: #2563eb; color: #ffffff !important; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">Activate Your HRMS Account</a>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 18px; margin: 24px 0; font-size: 13px; color: #166534; line-height: 1.5;">
        <strong style="color: #14532d; font-size: 14px;">Direct Access Links:</strong>
        <p style="margin: 8px 0 6px 0; color: #166534;">
          &bull; <strong>Cloud / Web Tunnel Link (Mobile / Anywhere):</strong><br>
          <a href="${activationLink}" style="color: #15803d; font-weight: 600; text-decoration: underline; word-break: break-all;">${activationLink}</a>
        </p>
        ${wifiActivationLink ? `
        <p style="margin: 8px 0 6px 0; color: #166534;">
          &bull; <strong>Direct Wi-Fi / Local Network Link:</strong><br>
          <a href="${wifiActivationLink}" style="color: #15803d; font-weight: 600; text-decoration: underline; word-break: break-all;">${wifiActivationLink}</a>
        </p>` : ''}
        <p style="margin: 8px 0 0 0; color: #166534;">
          &bull; <strong>Host PC Link (Local Machine):</strong><br>
          <a href="${localActivationLink}" style="color: #15803d; font-weight: 600; text-decoration: underline; word-break: break-all;">${localActivationLink}</a>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #166534; opacity: 0.9;">
          <em>Note: If an ngrok verification splash screen appears on mobile, tap "Visit Site" to continue to password setup.</em>
        </p>
      </div>

      <div class="notice" style="font-size: 12px; color: #78350f; margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; line-height: 1.5;">
        <strong style="color: #92400e; font-size: 13px;">Instructions for Activating Your Account:</strong>
        <ol style="margin: 8px 0 0 16px; padding: 0; color: #78350f;">
          <li style="margin-bottom: 4px;">Click the <strong>Activate Your HRMS Account</strong> button above or click one of the access links provided.</li>
          <li style="margin-bottom: 4px;">Set your secure enterprise password meeting security standards (minimum 8 characters with uppercase, lowercase, and numbers).</li>
          <li>Once submitted, your account will immediately become active and you will be redirected to the HRMS login screen.</li>
        </ol>
        <p style="margin-top: 10px; margin-bottom: 0; color: #92400e;"><strong>Security Notice:</strong> This activation link is single-use and will expire in ${expiry} hours. If you did not expect this invitation or require assistance, please contact your HR Administration immediately.</p>
      </div>
    </div>
    <div class="footer" style="border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; background-color: #f8fafc;">
      &copy; ${new Date().getFullYear()} ${company}. All rights reserved. Secure access to your workforce operating system.
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a responsive, enterprise HTML email for Client Supervisor onboarding.
   */
  generateClientSupervisorWelcomeEmailHtml(data: ClientSupervisorEmailData): string {
    const company = notificationConfig.companyName;
    const portalUrl = data.portalUrl || notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const localActivationLink = `http://localhost:3000/#activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Client Portal - ${data.clientName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff !important; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 28px; line-height: 1.6; background-color: #ffffff; color: #1e293b; }
    .greeting { font-size: 16px; margin-bottom: 16px; color: #0f172a; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { background-color: #0284c7; color: #ffffff !important; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25); }
    .notice { font-size: 12px; color: #78350f; margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; background-color: #f8fafc; }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div class="card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
    <div class="header" style="background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%); background-color: #0284c7; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff !important; font-size: 22px; font-weight: 700;">${company} Client Portal &bull; ${data.clientName}</h1>
    </div>
    <div class="content" style="padding: 32px 28px; line-height: 1.6; background-color: #ffffff; color: #1e293b;">
      <div class="greeting" style="font-size: 16px; margin-bottom: 16px; color: #0f172a; font-weight: 600;">Dear ${data.supervisorName},</div>
      <p style="font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.6;">You have been registered as an authorized Client Supervisor for <strong>${data.clientName}</strong> on the ${company} Client Portal. Through this portal, you can securely review assigned team deployments, verify employee attendance records, and manage billing authorizations.</p>
      
      <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; border-collapse: separate;">
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9; width: 45%;">Supervisor Name:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.supervisorName}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Client Organization:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.clientName}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Registered Email / Username:</td>
          <td style="color: #0f172a; font-size: 13px; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${data.recipientEmail}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px; font-weight: 500;">Client Portal URL:</td>
          <td style="color: #0284c7; font-size: 13px; font-weight: 700; text-align: right;"><a href="${portalUrl}" style="color: #0284c7; text-decoration: underline;">${portalUrl}</a></td>
        </tr>
      </table>

      <div class="btn-container" style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${activationLink}" class="btn" style="background-color: #0284c7; color: #ffffff !important; padding: 15px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">Set Up Password & Access Client Portal</a>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 18px; margin: 24px 0; font-size: 13px; color: #166534; line-height: 1.5;">
        <strong style="color: #14532d; font-size: 14px;">Direct Access Links:</strong>
        <p style="margin: 8px 0 6px 0; color: #166534;">
          &bull; <strong>Direct Local / Company Network Link:</strong><br>
          <a href="${localActivationLink}" style="color: #15803d; font-weight: 600; text-decoration: underline; word-break: break-all;">${localActivationLink}</a>
        </p>
        <p style="margin: 8px 0 0 0; color: #166534;">
          &bull; <strong>Cloud / Web Tunnel Link:</strong><br>
          <a href="${activationLink}" style="color: #15803d; font-weight: 600; text-decoration: underline; word-break: break-all;">${activationLink}</a>
        </p>
      </div>

      <div class="notice" style="font-size: 12px; color: #78350f; margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; line-height: 1.5;">
        <strong style="color: #92400e; font-size: 13px;">Important Security Notice:</strong> This activation link is single-use and will expire in ${expiry} hours. Internal HR administration functions remain restricted to ensure organizational data confidentiality.
      </div>
    </div>
    <div class="footer" style="border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; background-color: #f8fafc;">
      &copy; ${new Date().getFullYear()} ${company}. Client Portal Authorization & Access Control.
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a plain-text email alternative for high deliverability across Microsoft Outlook,
   * mobile clients, and corporate spam filters.
   */
  generateActivationEmailPlainText(data: ActivationEmailData): string {
    const localIp = getLocalIp();
    const company = data.companyName || notificationConfig.companyName;
    const portalUrl = notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const localActivationLink = `http://localhost:3000/#activate?token=${data.activationToken}`;
    const wifiActivationLink = localIp !== 'localhost' ? `http://${localIp}:3000/#activate?token=${data.activationToken}` : '';
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

To complete your onboarding, configure your password, and access your workforce profile, attendance, leaves, and services, please activate your account using one of the links below:

Primary Activation Link (Mobile / Anywhere):
${activationLink}
${wifiActivationLink ? `
Direct Wi-Fi / Local Network Link:
${wifiActivationLink}
` : ''}
Host PC Link (Local Machine):
${localActivationLink}

Important Security Notice:
This activation link is single-use and will expire in ${expiry} hours. If you did not expect this invitation or require assistance, please contact your HR Administration immediately.

© ${new Date().getFullYear()} ${company}. All rights reserved.`;
  }

  /**
   * Generates a plain-text email alternative for Client Supervisor onboarding.
   */
  generateClientSupervisorWelcomeEmailPlainText(data: ClientSupervisorEmailData): string {
    const company = notificationConfig.companyName;
    const portalUrl = data.portalUrl || notificationConfig.portalUrl;
    const activationLink = `${portalUrl}/#/activate?token=${data.activationToken}`;
    const localActivationLink = `http://localhost:3000/#activate?token=${data.activationToken}`;
    const expiry = data.expiryHours || 24;

    return `Dear ${data.supervisorName},

You have been registered as an authorized Client Supervisor for ${data.clientName} on the ${company} Client Portal.

Account Details:
------------------------------------------
Supervisor Name: ${data.supervisorName}
Client Organization: ${data.clientName}
Registered Email / Username: ${data.recipientEmail}
Client Portal URL: ${portalUrl}
------------------------------------------

To set up your password and access the Client Portal, please click one of the links below:

Primary Link:
${activationLink}

Direct Local / Company Network Link:
${localActivationLink}

Important Security Notice:
This activation link is single-use and will expire in ${expiry} hours. Internal HR administration functions remain restricted to ensure organizational data confidentiality.

© ${new Date().getFullYear()} ${company}. Client Portal Authorization & Access Control.`;
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
      process.env.MAIL_FROM_ADDRESS && !process.env.MAIL_FROM_ADDRESS.includes('noreply@')
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

    const subject = `Welcome to Breakthru Enterprise Solution Client Portal – Access for ${data.clientName}`;
    const html = this.generateClientSupervisorWelcomeEmailHtml(data);
    const text = this.generateClientSupervisorWelcomeEmailPlainText(data);

    const fromAddress =
      process.env.MAIL_FROM_ADDRESS && !process.env.MAIL_FROM_ADDRESS.includes('noreply@')
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
