import { Module } from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { UserModel } from '../DB/models/user.model.js';
import { ReviewModel } from '../DB/models/review.model.js';
import { ProductModel } from '../DB/models/product.model.js';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../common/service/token.service.js';

@Module({
  imports: [UserModel, ReviewModel, ProductModel],
  controllers: [ReviewController],
  providers: [ReviewService, TokenService, JwtService],
})
export class ReviewModule {}
