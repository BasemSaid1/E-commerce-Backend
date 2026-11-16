import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'Product Title must be string' })
  @IsNotEmpty({ message: 'Product Title is required' })
  @Length(2, 200)
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(1, { message: 'price cannot be zero or negative value' })
  price: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'stock must be a valid number' })
  @Min(0, { message: 'stock cannot be negative value' })
  @IsInt({ message: 'Stock must be an integer' })
  stock: number;

  @IsMongoId({ message: 'Invalid brand ID format' })
  @IsNotEmpty({ message: 'brand name is required' })
  brand: string;

  @IsMongoId({ message: 'Invalid category ID format' })
  @IsNotEmpty({ message: 'category name is required' })
  category: string;
}
