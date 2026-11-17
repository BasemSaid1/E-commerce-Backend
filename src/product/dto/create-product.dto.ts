import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  parseJsonArray,
  ProductOptionDto,
  ProductVariantDto,
} from './product-variant.dto.js';

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

  // بتبقى مطلوبة بس لو المنتج من غير متغيّرات (الـ service بيتأكد)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(1, { message: 'price cannot be zero or negative value' })
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'stock must be a valid number' })
  @Min(0, { message: 'stock cannot be negative value' })
  @IsInt({ message: 'Stock must be an integer' })
  stock?: number;

  @IsMongoId({ message: 'Invalid brand ID format' })
  @IsNotEmpty({ message: 'brand name is required' })
  brand: string;

  @IsMongoId({ message: 'Invalid category ID format' })
  @IsNotEmpty({ message: 'category name is required' })
  category: string;

  @IsOptional()
  @Transform(parseJsonArray(ProductOptionDto))
  @IsArray({ message: 'options must be an array' })
  @ArrayMaxSize(3, { message: 'a product can have at most 3 options' })
  @ValidateNested({ each: true })
  options?: ProductOptionDto[];

  @IsOptional()
  @Transform(parseJsonArray(ProductVariantDto))
  @IsArray({ message: 'variants must be an array' })
  @ArrayMaxSize(100, { message: 'a product can have at most 100 variants' })
  @ValidateNested({ each: true })
  variants?: ProductVariantDto[];
}
