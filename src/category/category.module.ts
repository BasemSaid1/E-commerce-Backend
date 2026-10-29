import { Module } from '@nestjs/common';
import { CategoryService } from './category.service.js';
import { CategoryController } from './category.controller.js';
import { CategoryModel } from '../DB/models/category.model.js';
import { UserModel } from '../DB/models/user.model.js';
import { AuthModule } from '../auth/auth.module.js';
import { TokenService } from '../common/service/token.service.js';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel, CategoryModel, AuthModule],
  controllers: [CategoryController],
  providers: [CategoryService, TokenService, JwtService],
})
export class CategoryModule {}
