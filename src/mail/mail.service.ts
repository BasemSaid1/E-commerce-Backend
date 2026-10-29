// import { Injectable, Logger } from '@nestjs/common';
// import { MailerService } from '@nestjs-modules/mailer';

// @Injectable()
// export class MailService {
//   private readonly logger = new Logger(MailService.name);
//   constructor(private readonly _mailerService: MailerService) {}

//   async sendVerificationOtp(email: string, otp: string): Promise<void> {
//     try {
//       await this._mailerService.sendMail({
//         to: email,
//         subject: 'Your Account Activation Code',
//         template: './otp',
//         context: { confirmEmailOTP: otp },
//       });
//     } catch (error: any) {
//       this.logger.error(
//         `Failed to send Verification Otp to ${email}: ${error.message}`,
//       );
//     }
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { OTP_EXPIRES_IN_MINUTES } from '../common/constants/otp.constant.js';

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
  ): Promise<void> {
    const { subject, title, message, expiresInMinutes } = OTP_MAIL_CONFIG[type];

    try {
      await this._mailerService.sendMail({
        to: email,
        subject,
        template: './otp',
        context: { title, message, expiresInMinutes, otp, userName },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send ${type} OTP to ${email}: ${error.message}`,
      );
    }
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await this.sendOtpMail('VERIFY_EMAIL', email, otp);
  }

  async sendForgetPasswordOtp(
    email: string,
    userName: string,
    otp: string,
  ): Promise<void> {
    await this.sendOtpMail('FORGET_PASSWORD', email, otp, userName);
  }
}
