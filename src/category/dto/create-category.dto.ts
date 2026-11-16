import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: 'category name is required' })
  @Length(2, 20, {
    message: 'Category name must be between 2 and 20 characters long',
  })
  name: string;
}
