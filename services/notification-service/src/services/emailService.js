"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
class EmailService {
    transporter = null;
    constructor(customTransporter) {
        if (customTransporter) {
            this.transporter = customTransporter;
        }
        else {
            this.initTransporter();
        }
    }
    initTransporter() {
        const { host, port, secure, user, pass } = env_1.notificationConfig.mail;
        if (user && pass) {
            this.transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure,
                auth: { user, pass },
            });
        }
        else {
            // In development / testing without active SMTP creds, use a JSON / stream transporter
            this.transporter = nodemailer_1.default.createTransport({
                jsonTransport: true,
            });
        }
    }
    /**
     * Generates a responsive, enterprise HTML email for account activation.
     * Plaintext passwords are NEVER included.
     */
    generateActivationEmailHtml(data) {
        const company = data.companyName || env_1.notificationConfig.companyName;
        const portalUrl = env_1.notificationConfig.portalUrl;
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
    .btn { background-color: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; transition: background-color 0.2s; }
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
        <div class="details-row"><span class="label">Official Email:</span><span class="value">${data.recipientEmail}</span></div>
      </div>

      <div class="btn-container">
        <a href="${activationLink}" class="btn">Activate Your HRMS Account</a>
      </div>

      <div class="notice">
        <strong>Important Security Notice:</strong> This activation link is single-use and will expire in ${expiry} hours. If you did not expect this invitation or require assistance, please contact your HR Administration immediately.
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
     * Sends physical email through configured nodemailer transporter.
     * Logs only recipient and delivery result; ZERO token logging.
     */
    async sendActivationEmail(data) {
        if (!this.transporter) {
            throw new Error('Email transporter is not initialized');
        }
        const company = data.companyName || env_1.notificationConfig.companyName;
        const subject = `Welcome to ${company} – Your HRMS Account Is Ready`;
        const html = this.generateActivationEmailHtml(data);
        const from = `"${env_1.notificationConfig.mail.fromName}" <${env_1.notificationConfig.mail.fromAddress}>`;
        const info = await this.transporter.sendMail({
            from,
            to: data.recipientEmail,
            subject,
            html,
        });
        const isAccepted = Array.isArray(info.accepted) ? info.accepted.length > 0 : true;
        return {
            messageId: info.messageId || 'simulated-msg-id',
            accepted: isAccepted,
        };
    }
}
exports.EmailService = EmailService;
