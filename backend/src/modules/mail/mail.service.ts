import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const user = this.configService.get<string>('mail.user');

    // Mail is optional in dev — if it isn't configured we log instead of
    // throwing, so the rest of the app still boots on a machine without
    // SMTP credentials set up.
    if (!host || !user) {
      this.logger.warn('MAIL_HOST/MAIL_USER not set — emails will be logged instead of sent');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: {
        user,
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const from = this.configService.get<string>('mail.from') || 'no-reply@example.com';
    const subject = 'Reset your password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">Reset your password</h2>
        <p style="color: #475569;">
          We received a request to reset the password for your Task &amp; Project
          Manager account. Click the button below to choose a new password.
          This link expires in 30 minutes.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background: #2563eb; color: #fff; padding: 12px 20px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="color: #94a3b8; font-size: 13px;">
          If you didn't request this, you can safely ignore this email — your
          password will stay the same.
        </p>
        <p style="color: #94a3b8; font-size: 13px;">
          Or paste this link into your browser:<br />
          <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
        </p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.log(`[DEV] Password reset link for ${to}: ${resetUrl}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from, to, subject, html });
    } catch (err) {
      // Never let an SMTP failure leak whether the account exists or block
      // the generic response the controller already returns.
      this.logger.error(`Failed to send password reset email to ${to}`, err as Error);
    }
  }
}
