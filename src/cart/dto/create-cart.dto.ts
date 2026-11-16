import { IsInt, IsMongoId, IsNotEmpty, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId({ message: 'invalid product id' })
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}
