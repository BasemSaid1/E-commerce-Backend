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
  Req,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';

import { ProductService } from './product.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RoleGuard } from '../common/guards/role.guard.js';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer.util.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { CacheInterceptor } from '../caching/interceptors/http-cache.interceptor.js';
import {
  deleteImagesByUrls,
  uploadToCloudinary,
} from '../common/utils/cloudinary.util.js';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private async getFileUrls(files: {
    file?: Express.Multer.File[];
    files?: Express.Multer.File[];
  }) {
    const mainImage = files?.file?.[0];
    const galleryImages = files?.files ?? [];

    // لو أي رفع فشل، بنمسح اللي اترفع قبله عشان ما يفضلش صور يتيمة
    const uploaded: string[] = [];
    const upload = async (file: Express.Multer.File) => {
      const { secure_url } = await uploadToCloudinary(file.buffer, 'products');
      uploaded.push(secure_url);
      return secure_url;
    };

    try {
      const imageUrl = mainImage ? await upload(mainImage) : undefined;
      const imagesUrl =
        galleryImages.length > 0
          ? await Promise.all(galleryImages.map(upload))
          : undefined;

      return { mainImage, imageUrl, imagesUrl };
    } catch (error) {
      await deleteImagesByUrls(uploaded);
      throw error;
    }
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 10 },
      ],
      multerOptions,
    ),
  )
  @Roles(RoleEnum.ADMIN)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    if (!files?.file?.[0]) {
      throw new BadRequestException('Product main image is required');
    }

    const { imageUrl, imagesUrl } = await this.getFileUrls(files);

    const adminId = req.user?._id as unknown as Types.ObjectId;

    try {
      return await this.productService.create(
        createProductDto,
        imageUrl!,
        imagesUrl ?? [],
        adminId,
      );
    } catch (error) {
      await deleteImagesByUrls([imageUrl, ...(imagesUrl ?? [])]);
      throw error;
    }
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: Types.ObjectId) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 10 },
      ],
      multerOptions,
    ),
  )
  @Roles(RoleEnum.ADMIN)
  async update(
    @Param('id') id: Types.ObjectId,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    const { imageUrl, imagesUrl } = await this.getFileUrls(files);

    try {
      return await this.productService.update(
        new Types.ObjectId(id),
        updateProductDto,
        imageUrl,
        imagesUrl,
      );
    } catch (error) {
      await deleteImagesByUrls([imageUrl, ...(imagesUrl ?? [])]);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: Types.ObjectId) {
    return this.productService.remove(new Types.ObjectId(id));
  }
}
