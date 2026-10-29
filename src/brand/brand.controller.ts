import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { BrandService } from './brand.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { RoleGuard } from '../common/guards/role.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer.util.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';
import { Types } from 'mongoose';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard.js';

@Controller('brand')
@UseGuards(AuthGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @UseGuards(RoleGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Roles(RoleEnum.ADMIN)
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createBrandDto: CreateBrandDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('brand logo is required');

    const logoUrl = `http://127.0.0.1:3000/${file.path.replace(/\\/g, '/')}`;

    const adminId = req.user?._id as unknown as Types.ObjectId;

    return this.brandService.create(createBrandDto, logoUrl, adminId);
  }

  @Get()
  findAll() {
    return this.brandService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: Types.ObjectId) {
    return this.brandService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Roles(RoleEnum.ADMIN)
  update(
    @Param('id') id: Types.ObjectId,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let logoUrl: string | undefined;

    if (file)
      logoUrl = `http://127.0.0.1:3000/${file.path.replace(/\\/g, '/')}`;
    return this.brandService.update(id, updateBrandDto, logoUrl);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: Types.ObjectId) {
    return this.brandService.remove(id);
  }
}
