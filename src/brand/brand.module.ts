import { Module } from '@nestjs/common';
import { BrandService } from './brand.service.js';
import { BrandController } from './brand.controller.js';
import { UserModel } from '../DB/models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { CategoryModel } from '../DB/models/category.model.js';
import { BrandModel } from '../DB/models/brand.model.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel, CategoryModel, BrandModel, AuthModule],
  controllers: [BrandController],
  providers: [BrandService, TokenService, JwtService],
})
export class BrandModule {}
