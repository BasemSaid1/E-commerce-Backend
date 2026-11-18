import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { OTP_EXPIRES_IN_MINUTES } from '../common/constants/otp.constant.js';
import { join } from 'node:path';
import ejs from 'ejs';

type OtpMailType = 'VERIFY_EMAIL' | 'FORGET_PASSWORD';

const OTP_MAIL_CONFIG: Record<
  OtpMailType,
  { subject: string; title: string; message: string; expiresInMinutes: number }
> = {
  VERIFY_EMAIL: {
    subject: 'Your Account Activation Code',
    title: 'Verify Your Email',
    message:
      'Thank you for registering. Use the One-Time Password (OTP) below to activate your account.',
    expiresInMinutes: OTP_EXPIRES_IN_MINUTES.VERIFY_EMAIL,
  },
  FORGET_PASSWORD: {
    subject: 'Reset Your Password',
    title: 'Reset Your Password',
    message: 'Use the One-Time Password (OTP) below to reset your password.',
    expiresInMinutes: OTP_EXPIRES_IN_MINUTES.FORGET_PASSWORD,
  },
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly _mailerService: MailerService) {}

  private async sendOtpMail(
    type: OtpMailType,
    email: string,
    otp: string,
    userName?: string,
  ): Promise<boolean> {
    const { subject, title, message, expiresInMinutes } = OTP_MAIL_CONFIG[type];
    const context = { title, message, expiresInMinutes, otp, userName };

    try {
      if (process.env.BREVO_API_KEY?.trim()) {
        await this.sendViaBrevo(email, subject, context);
      } else {
        await this._mailerService.sendMail({
          to: email,
          subject,
          template: './otp',
          context,
        });
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send ${type} OTP to ${email}: ${error.code ?? ''} ${error.message}`,
      );
      return false;
    }
  }

  private async sendViaBrevo(
    to: string,
    subject: string,
    context: Record<string, unknown>,
  ) {
    const html = await ejs.renderFile(
      join(process.cwd(), 'src', 'mail', 'templates', 'otp.ejs'),
      context,
    );

    const senderEmail = (
      process.env.MAIL_FROM ??
      process.env.MAIL_USER ??
      ''
    ).trim();

    const res = await fetch(
      process.env.BREVO_API_URL ?? 'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY!.trim(),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'No Reply', email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) {
      throw new Error(`Brevo responded ${res.status}: ${await res.text()}`);
    }
  }

  async sendVerificationOtp(email: string, otp: string): Promise<boolean> {
    return this.sendOtpMail('VERIFY_EMAIL', email, otp);
  }

  async sendForgetPasswordOtp(
    email: string,
    userName: string,
    otp: string,
  ): Promise<boolean> {
    return this.sendOtpMail('FORGET_PASSWORD', email, otp, userName);
  }
}
