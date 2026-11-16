import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

export class CreateBrandDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'brand name is required' })
  @Length(2, 20, {
    message: 'brand name must be between 2 and 20 characters long',
  })
  name: string;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  })
  @IsArray({ message: 'categories must be as an array' })
  @ArrayNotEmpty({ message: 'at least one category ID must exist' })
  @IsMongoId({
    each: true,
    message: 'Each category ID must be a valid mongodb objectId',
  })
  categories: string[];
}
