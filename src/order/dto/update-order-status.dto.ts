import { IsIn } from 'class-validator';
import { OrderStatusEnum } from '../../common/enums/order.enum.js';

export class UpdateOrderStatusDto {
  @IsIn([
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.SHIPPED,
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.CANCELLED,
  ])
  status: OrderStatusEnum;
}
