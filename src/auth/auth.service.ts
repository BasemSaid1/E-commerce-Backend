import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HUserDocument, User } from '../DB/models/user.model.js';
import { Model } from 'mongoose';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { compare, hash } from '../common/security/hash.js';
import { MailService } from '../mail/mail.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ProviderEnum } from '../common/enums/user.enum.js';
import { TokenService } from '../common/service/token.service.js';
import { OAuth2Client } from 'google-auth-library';
import { LoginGoogleDto } from './dto/login-google.dto.js';
import { randomInt } from 'node:crypto';
import { ForgetPasswordDto } from './dto/forget-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { OTP_EXPIRES_IN_MINUTES } from '../common/constants/otp.constant.js';

@Injectable()
export class AuthService {
  private readonly _googleClient = new OAuth2Client();
  constructor(
    @InjectModel(User.name) private readonly _userModel: Model<HUserDocument>,
    private readonly _mailService: MailService,
    private readonly _tokenService: TokenService,
  ) {}

  async register(createAuthDto: CreateAuthDto): Promise<HUserDocument> {
    const existingUser = await this._userModel.findOne({
      email: createAuthDto.email,
    });
    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = await hash(otp);

    // const expiryTime = new Date();
    // expiryTime.setMinutes(expiryTime.getMinutes() + 1);
    const expiryTime = new Date();
    expiryTime.setMinutes(
      expiryTime.getMinutes() + OTP_EXPIRES_IN_MINUTES.VERIFY_EMAIL,
    );

    const newUser = new this._userModel({
      ...createAuthDto,
      confirmEmailOTP: hashedOTP,
      otpExpiresAt: expiryTime,
    });

    const savedUser = await newUser.save();

    await this._mailService.sendVerificationOtp(savedUser.email, otp);
    return savedUser;
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this._userModel.findOne({
      email: verifyEmailDto.email,
    });

    if (!user) {
      throw new NotFoundException(
        'Not Account Recored match this email address',
      );
    }

    if (user.confirmEmail) {
      throw new BadRequestException(
        'this email account has already been confirmed',
      );
    }

    if (
      !user.confirmEmailOTP ||
      !(await compare(verifyEmailDto.confirmEmailOTP, user.confirmEmailOTP))
    ) {
      throw new BadRequestException('this code provided in incorrect');
    }

    const expiresAt = user.otpExpiresAt
      ? new Date(user.otpExpiresAt).getTime()
      : NaN;

    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      throw new BadRequestException(
        'this verification code has expired , please resend otp again',
      );
    }

    user.confirmEmail = new Date();
    user.confirmEmailOTP = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    return {
      message: 'your email address has been successfully verified',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;
    const user = await this._userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException(
        'Not Account Recored match this email address',
      );
    }

    if (user.confirmEmail) {
      throw new BadRequestException(
        'this email account has already been confirmed',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOTP = await hash(otp);

    const newExpiryTime = new Date();
    // newExpiryTime.setMinutes(newExpiryTime.getMinutes() + 1);
    newExpiryTime.setMinutes(
      newExpiryTime.getMinutes() + OTP_EXPIRES_IN_MINUTES.VERIFY_EMAIL,
    );

    user.confirmEmailOTP = hashedOTP;
    user.otpExpiresAt = newExpiryTime;
    await user.save();

    await this._mailService.sendVerificationOtp(user.email, otp);

    return {
      message:
        'A Fresh verification code has been successfully dispatched to your inbox',
    };
  }

  async login(loginDto: LoginDto): Promise<{ message: string; token: string }> {
    const { email, password } = loginDto;
    const user = await this._userModel.findOne({
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnum.SYSTEM,
    });

    if (!user) throw new NotFoundException('user not found');

    if (!(await compare(password, user.password))) {
      throw new BadRequestException('Invalid email or password');
    }

    const token = await this._tokenService.generateToken(user._id, user.role);

    return { message: 'Done', token };
  }

  async saveProfilePic(
    userId: string,
    filePath: string,
  ): Promise<HUserDocument> {
    const publicUrl = `http://127.0.0.1:3000/${filePath.replace(/\\/g, '/')}`;

    const updatedUser = await this._userModel.findByIdAndUpdate(
      userId,
      {
        profilePic: publicUrl,
      },
      { returnDocument: 'after' },
    );

    if (!updatedUser) throw new NotFoundException('user account not found');

    return updatedUser;
  }

  async loginWithGoogle(
    loginGoogleDto: LoginGoogleDto,
  ): Promise<{ message: string; token: string }> {
    const ticket = await this._googleClient.verifyIdToken({
      idToken: loginGoogleDto.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new BadRequestException('invalid google token');
    }

    const { email, given_name, family_name, picture, email_verified } = payload;

    if (!email_verified) {
      throw new BadRequestException('google email is not verified');
    }

    let user = await this._userModel.findOne({ email });

    if (user) {
      if (user.provider !== ProviderEnum.GOOGLE) {
        throw new ConflictException(
          'this email is already registered with a different method, please login using your password',
        );
      }
    } else {
      user = await this._userModel.create({
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        email,
        provider: ProviderEnum.GOOGLE,
        confirmEmail: new Date(),
        profilePic: picture,
      });
    }

    const token = await this._tokenService.generateToken(user._id, user.role);

    return { message: 'Done', token };
  }

  async forgetPassword(dto: ForgetPasswordDto): Promise<{ message: string }> {
    const otp = randomInt(100000, 1000000).toString();
    const hashedOTP = await hash(otp);

    const user = await this._userModel.findOneAndUpdate(
      {
        email: dto.email,
        confirmEmail: { $exists: true },
        provider: ProviderEnum.SYSTEM,
      },
      {
        forgetPasswordOTP: hashedOTP,
        // forgetPasswordOTPExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        forgetPasswordOTPExpiresAt: new Date(
          Date.now() + OTP_EXPIRES_IN_MINUTES.FORGET_PASSWORD * 60 * 1000,
        ),
      },
    );

    if (!user) throw new NotFoundException('user not found');

    await this._mailService.sendForgetPasswordOtp(
      user.email,
      user.userName,
      otp,
    );

    return { message: 'Check your inbox' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = dto;

    const user = await this._userModel.findOne({
      email,
      provider: ProviderEnum.SYSTEM,
      confirmEmail: { $exists: true },
      forgetPasswordOTP: { $exists: true },
    });

    if (!user || !user.forgetPasswordOTP) {
      throw new NotFoundException('user not found');
    }

    if (
      !user.forgetPasswordOTPExpiresAt ||
      user.forgetPasswordOTPExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('OTP expired, please request a new one');
    }

    if (!(await compare(otp, user.forgetPasswordOTP))) {
      throw new BadRequestException('Invalid OTP');
    }

    user.password = newPassword;
    user.forgetPasswordOTP = undefined;
    user.forgetPasswordOTPExpiresAt = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }
}
