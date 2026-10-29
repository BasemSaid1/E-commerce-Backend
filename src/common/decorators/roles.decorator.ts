import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../enums/user.enum.js';

export const Roles = (...roles: RoleEnum[]) => SetMetadata('roles', roles);
