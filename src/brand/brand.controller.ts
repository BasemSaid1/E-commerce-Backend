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
import {
  deleteImageByUrl,
  uploadToCloudinary,
} from '../common/utils/cloudinary.util.js';

@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Roles(RoleEnum.ADMIN)
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createBrandDto: CreateBrandDto,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('brand logo is required');

    const { secure_url: logoUrl } = await uploadToCloudinary(
      file.buffer,
      'brands',
    );

    const adminId = req.user?._id as unknown as Types.ObjectId;

    try {
      return await this.brandService.create(createBrandDto, logoUrl, adminId);
    } catch (error) {
      await deleteImageByUrl(logoUrl);
      throw error;
    }
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
  @UseGuards(AuthGuard, RoleGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Roles(RoleEnum.ADMIN)
  async update(
    @Param('id') id: Types.ObjectId,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let logoUrl: string | undefined;

    if (file) {
      logoUrl = (await uploadToCloudinary(file.buffer, 'brands')).secure_url;
    }

    try {
      return await this.brandService.update(id, updateBrandDto, logoUrl);
    } catch (error) {
      await deleteImageByUrl(logoUrl);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: Types.ObjectId) {
    return this.brandService.remove(id);
  }
}
