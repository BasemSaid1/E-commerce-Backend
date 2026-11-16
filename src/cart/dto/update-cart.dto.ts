import { IsEnum } from 'class-validator';

export enum CartAction {
  INCREASE = 'increase',
  DECREASE = 'decrease',
}

export class UpdateCartItemDto {
  @IsEnum(CartAction)
  action: CartAction;
}
