import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import type { Request } from 'express';
import { Types } from 'mongoose';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.reviewService.create(createReviewDto, userId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: Types.ObjectId) {
    return this.reviewService.findByProduct(productId);
  }

  @Patch(':reviewId')
  @UseGuards(AuthGuard)
  update(
    @Param('reviewId') reviewId: Types.ObjectId,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req: Request,
  ) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.reviewService.update(reviewId, updateReviewDto, userId);
  }

  @Delete(':reviewId')
  @UseGuards(AuthGuard)
  delete(@Param('reviewId') reviewId: Types.ObjectId, @Req() req: Request) {
    const userId = req.user?._id as unknown as Types.ObjectId;
    return this.reviewService.delete(reviewId, userId);
  }
}
