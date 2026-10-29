import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { RoleEnum } from '../enums/user.enum.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(userId: Types.ObjectId, role: string): Promise<string> {
    const payload = { sub: userId };

    const secret = this.configService.get<string>(
      role.toUpperCase() === RoleEnum.ADMIN
        ? 'JWT_ADMIN_SECRET'
        : 'JWT_USER_SECRET',
    );

    const expiresIn = this.configService.get<string>(
      role.toUpperCase() === RoleEnum.ADMIN
        ? 'JWT_ADMIN_EXPIRES'
        : 'JWT_USER_EXPIRES',
    );

    const options: any = { secret };
    if (expiresIn) options.expiresIn = expiresIn;

    return await this.jwtService.signAsync(payload, options);
  }

  async verifyToken(token: string, roleSchema: string): Promise<any> {
    try {
      const secret = this.configService.get<string>(
        roleSchema.toUpperCase() === RoleEnum.ADMIN
          ? 'JWT_ADMIN_SECRET'
          : 'JWT_USER_SECRET',
      );

      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      throw new UnauthorizedException(
        'invalid or expired token signature for schema context',
        roleSchema,
      );
    }
  }
}
