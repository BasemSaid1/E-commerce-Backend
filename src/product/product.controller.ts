// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Delete,
//   UseGuards,
//   UseInterceptors,
//   Req,
//   UploadedFiles,
//   UploadedFile,
//   BadRequestException,
// } from '@nestjs/common';
// import { ProductService } from './product.service.js';
// import { CreateProductDto } from './dto/create-product.dto.js';
// import { UpdateProductDto } from './dto/update-product.dto.js';
// import { AuthGuard } from '../common/guards/auth.guard.js';
// import { RoleGuard } from '../common/guards/role.guard.js';
// import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
// import { multerOptions } from '../common/utils/multer.util.js';
// import { Roles } from '../common/decorators/roles.decorator.js';
// import { RoleEnum } from '../common/enums/user.enum.js';
// import type { Request } from 'express';
// import { Types } from 'mongoose';

// @Controller('product')
// export class ProductController {
//   constructor(private readonly productService: ProductService) {}

//   @Post()
//   @UseGuards(AuthGuard, RoleGuard)
//   @UseInterceptors(FileInterceptor('file', multerOptions))
//   @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
//   @Roles(RoleEnum.ADMIN)
//   create(
//     @Body() createProductDto: CreateProductDto,
//     @Req() req: Request,
//     @UploadedFile() file: Express.Multer.File,
//     @UploadedFiles() files: Express.Multer.File[],
//   ) {
//     if (!file) throw new BadRequestException('product image is required');

//     const imageUrl = `http://127.0.0.1:3000/${file.path.replace(/\\/g, '/')}`;

//     if (!files) throw new BadRequestException('product images is required');

//     const imagesUrl: string[] = files.map(
//       (f) => `http://127.0.0.1:3000/${f.path.replace(/\\/g, '/')}`,
//     );

//     const adminId = req.user?._id as unknown as Types.ObjectId;
//     return this.productService.create(
//       createProductDto,
//       imageUrl,
//       imagesUrl,
//       adminId,
//     );
//   }

//   @Get()
//   findAll() {
//     return this.productService.findAll();
//   }

//   @Get(':id')
//   findOne(@Param('id') id: Types.ObjectId) {
//     return this.productService.findOne(id);
//   }

//   @Patch(':id')
//   @UseGuards(AuthGuard, RoleGuard)
//   @UseInterceptors(FileInterceptor('file', multerOptions))
//   @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
//   @Roles(RoleEnum.ADMIN)
//   update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
//     return this.productService.update(+id, updateProductDto);
//   }

//   @Delete(':id')
//   @UseGuards(AuthGuard, RoleGuard)
//   @Roles(RoleEnum.ADMIN)
//   remove(@Param('id') id: string) {
//     return this.productService.remove(+id);
//   }
// }

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
} from '@nestjs/common';

import { ProductService } from './product.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { RoleGuard } from '../common/guards/role.guard.js';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/utils/multer.util.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleEnum } from '../common/enums/user.enum.js';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { CacheInterceptor } from '../caching/interceptors/http-cache.interceptor.js';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private getFileUrls(files: {
    file?: Express.Multer.File[];
    files?: Express.Multer.File[];
  }) {
    const mainImage = files.file?.[0];

    const galleryImages = files.files ?? [];

    const imageUrl = mainImage
      ? `http://127.0.0.1:3000/${mainImage.path.replace(/\\/g, '/')}`
      : undefined;

    const imagesUrl =
      galleryImages.length > 0
        ? galleryImages.map(
            (file) => `http://127.0.0.1:3000/${file.path.replace(/\\/g, '/')}`,
          )
        : undefined;

    return {
      mainImage,
      imageUrl,
      imagesUrl,
    };
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
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: Request,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    const { mainImage, imageUrl, imagesUrl } = this.getFileUrls(files);

    if (!mainImage) {
      throw new BadRequestException('Product main image is required');
    }

    const adminId = req.user?._id as unknown as Types.ObjectId;

    return this.productService.create(
      createProductDto,
      imageUrl!,
      imagesUrl ?? [],
      adminId,
    );
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  findAll() {
    return this.productService.findAll();
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
  update(
    @Param('id') id: Types.ObjectId,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    const { imageUrl, imagesUrl } = this.getFileUrls(files);

    return this.productService.update(
      new Types.ObjectId(id),
      updateProductDto,
      imageUrl,
      imagesUrl,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: Types.ObjectId) {
    return this.productService.remove(new Types.ObjectId(id));
  }
}
