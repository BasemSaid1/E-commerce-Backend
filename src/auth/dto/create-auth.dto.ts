import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { GenderEnum, RoleEnum } from '../../common/enums/user.enum.js';

export class CreateAuthDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 20, {
    message: 'First Name must be between 2 and 20 charactor long',
  })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 20, {
    message: 'Last Name must be between 2 and 20 charactor long',
  })
  lastName: string;

  @IsEmail({}, { message: 'please provide a valid email format' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  password: string;

  @IsEnum(GenderEnum, {
    message: 'provided value is not gender',
  })
  @IsOptional()
  gender?: GenderEnum;

  @IsEnum(RoleEnum, {
    message: 'provided value is not Role',
  })
  @IsOptional()
  role?: RoleEnum;
}
