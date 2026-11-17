import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductOptionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'option name must be a string' })
  @IsNotEmpty({ message: 'option name is required' })
  @Length(1, 30, { message: 'option name must be between 1 and 30 characters' })
  name: string;

  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  @IsArray({ message: 'option values must be an array' })
  @ArrayMinSize(1, { message: 'each option needs at least one value' })
  @ArrayMaxSize(30, { message: 'an option cannot have more than 30 values' })
  @IsString({ each: true, message: 'option values must be strings' })
  @IsNotEmpty({ each: true, message: 'option values cannot be empty' })
  @MaxLength(50, {
    each: true,
    message: 'option value must be at most 50 characters',
  })
  values: string[];
}

export class VariantAttributeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class ProductVariantDto {
  @IsOptional()
  @IsMongoId({ message: 'invalid variant id' })
  _id?: string;

  @IsArray({ message: 'variant attributes must be an array' })
  @ArrayMinSize(1, { message: 'variant attributes are required' })
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes: VariantAttributeDto[];

  @Type(() => Number)
  @IsNumber({}, { message: 'variant price must be a valid number' })
  @Min(1, { message: 'variant price cannot be zero or negative value' })
  price: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'variant stock must be a valid number' })
  @IsInt({ message: 'variant stock must be an integer' })
  @Min(0, { message: 'variant stock cannot be negative value' })
  stock: number;
}

export function parseJsonArray<T extends object>(cls: new () => T) {
  return ({ value }: { value: unknown }) => {
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return value;
      }
    }
    return Array.isArray(parsed) ? plainToInstance(cls, parsed) : parsed;
  };
}
