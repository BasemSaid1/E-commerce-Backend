import { IsDate, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @IsInt()
  @Min(1)
  maxUsageCount: number;

  @IsString()
  @IsNotEmpty()
  expiryDate: number;
}
