import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RoleGuard } from '../common/guards/role.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';

@Controller('user')
@UseGuards(AuthGuard, RoleGuard)
@Roles(RoleEnum.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('admin/list')
  findAllForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('verified') verified?: string,
  ) {
    return this.userService.findAllForAdmin({
      page: Number(page),
      limit: Number(limit),
      search,
      role,
      verified,
    });
  }

  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
