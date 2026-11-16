import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 500,
  })
  comment: string;
}

export const reviewSchema = SchemaFactory.createForClass(Review);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export type HReviewDocument = HydratedDocument<Review>;

export const ReviewModel = MongooseModule.forFeature([
  { name: Review.name, schema: reviewSchema },
]);
