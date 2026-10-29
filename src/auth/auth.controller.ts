import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer.util.js';
import { LoginGoogleDto } from './dto/login-google.dto.js';
import { ForgetPasswordDto } from './dto/forget-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async register(@Body() createAuthDto: CreateAuthDto) {
    const user = await this.authService.register(createAuthDto);
    return {
      success: true,
      message: 'Done',
      results: user,
    };
  }

  @Patch('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.verifyEmail(verifyEmailDto);
  }

  @Patch('resend-otp')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return await this.authService.resendOtp(resendOtpDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@Req() req: any) {
    return {
      message: 'Done',
      results: req.user,
    };
  }

  @Patch('profile-pic')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadProfilePic(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user._id;
    const filePath = file.path;

    const updatedUser = await this.authService.saveProfilePic(userId, filePath);

    return {
      success: true,
      message: 'profile image uploaded successfully',
      user: updatedUser,
    };
  }

  @Post('login/google')
  async loginWithGoogle(@Body() loginGoogleDto: LoginGoogleDto) {
    return await this.authService.loginWithGoogle(loginGoogleDto);
  }

  @Patch('forget-password')
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    return await this.authService.forgetPassword(dto);
  }

  @Patch('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
