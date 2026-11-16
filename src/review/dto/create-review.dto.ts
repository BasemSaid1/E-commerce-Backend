import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId({ message: 'Invalid product reference id' })
  @IsNotEmpty({ message: 'Product id is required' })
  product: string;

  @Min(1, { message: 'Rating must be a positive number' })
  @Max(5, { message: 'Rating must be less than or equal to 5' })
  rating: number;

  @IsString({ message: 'Comment must be a string' })
  @IsNotEmpty({ message: 'Comment is required' })
  @Length(3, 500, { message: 'Comment must be between 3 and 500 characters' })
  comment: string;
}
