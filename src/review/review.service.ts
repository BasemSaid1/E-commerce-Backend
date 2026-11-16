import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HReviewDocument, Review } from '../DB/models/review.model.js';
import { HProductDocument, Product } from '../DB/models/product.model.js';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly _reviewModel: Model<HReviewDocument>,
    @InjectModel(Product.name)
    private readonly _productModel: Model<HProductDocument>,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: Types.ObjectId) {
    const product = await this._productModel.exists({
      _id: createReviewDto.product,
    });

    if (!product) {
      throw new NotFoundException(
        'the Product you want to review does not exist',
      );
    }

    const alreadyReviewed = await this._reviewModel.exists({
      user: userId,
      product: createReviewDto.product,
    });

    if (alreadyReviewed) {
      throw new ConflictException('you have already reviewed this product');
    }

    const review = new this._reviewModel({
      ...createReviewDto,
      user: userId,
    });
    return (await review.save()).populate(
      'user',
      'firstName lastName email -_id',
    );
  }

  async findByProduct(productId: Types.ObjectId) {
    return await this._reviewModel
      .find({ product: productId })
      .populate('user', 'firstName lastName email -_id')
      .sort({ createdAt: -1 });
  }

  async update(
    reviewId: Types.ObjectId,
    updateReviewDto: UpdateReviewDto,
    userId: Types.ObjectId,
  ) {
    const review = await this._reviewModel.findOne({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you are not authorized to update this review',
      );
    }

    if (updateReviewDto.rating) review.rating = updateReviewDto.rating;
    if (updateReviewDto.comment) review.comment = updateReviewDto.comment;
    return (await review.save()).populate(
      'user',
      'firstName lastName email -_id',
    );
  }

  async delete(reviewId: Types.ObjectId, userId: Types.ObjectId) {
    const review = await this._reviewModel.deleteOne({
      _id: reviewId,
      user: userId,
    });

    if (review.deletedCount === 0) {
      throw new NotFoundException(
        'Review not found or you are not authorized to delete this review',
      );
    }

    return { message: 'Review deleted successfully' };
  }
}
