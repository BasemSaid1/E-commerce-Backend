import { Transform } from 'class-transformer';
import {
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
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray({ message: 'categories must be as an array' })
  @IsMongoId({
    each: true,
    message: 'Each category ID must be a valid mongodb objectId',
  })
  @IsNotEmpty({ message: 'at least one category ID must be exists' })
  categories: [string];
}
