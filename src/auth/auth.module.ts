import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UserModel } from '../DB/models/user.model.js';
import { MailModule } from '../mail/mail.module.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel, MailModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtService],
})
export class AuthModule {}
