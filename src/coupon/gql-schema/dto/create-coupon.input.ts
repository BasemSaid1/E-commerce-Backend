import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateCouponDto {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  code: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  maxUsageCount: number;

  @Field(() => String)
  @IsDateString()
  @IsNotEmpty()
  expiryDate: number;
}
