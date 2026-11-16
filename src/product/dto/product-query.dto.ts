import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsMongoId({
    message: 'Invalid category ID format',
  })
  category?: string;

  @IsOptional()
  @IsMongoId({
    message: 'Invalid brand ID format',
  })
  brand?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: 'minPrice must be a valid number',
    },
  )
  @Min(0, {
    message: 'minPrice cannot be negative',
  })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    {
      message: 'maxPrice must be a valid number',
    },
  )
  @Min(0, {
    message: 'maxPrice cannot be negative',
  })
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'newest', 'oldest'])
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
