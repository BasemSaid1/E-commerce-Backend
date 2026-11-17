import { IsInt, IsMongoId, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId({ message: 'invalid product id' })
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId({ message: 'invalid variant id' })
  variantId?: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
