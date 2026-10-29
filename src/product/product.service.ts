import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HProductDocument, Product } from '../DB/models/product.model.js';
import { Brand, HBrandDocument } from '../DB/models/brand.model.js';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly _productModel: Model<HProductDocument>,
    @InjectModel(Brand.name)
    private readonly _brandModel: Model<HBrandDocument>,
  ) {}

  private async validateBrandCategoryRelationship(
    brandId: string,
    categoryId: string,
  ): Promise<void> {
    const brand = await this._brandModel.findById(brandId);
    if (!brand) throw new NotFoundException('the assigned brand not exists');

    const supportedCategoryIds = brand.categories.map((id) => id.toString());

    if (!supportedCategoryIds.includes(categoryId)) {
      throw new BadRequestException(
        `business role : the brand ${brand.name} does not belong to or support specific category`,
      );
    }
  }

  async create(
    createProductDto: CreateProductDto,
    imageUrl: string,
    imagesUrl: string[],
    adminId: Types.ObjectId,
  ) {
    await this.validateBrandCategoryRelationship(
      createProductDto.brand,
      createProductDto.category,
    );

    const newProduct = new this._productModel({
      ...createProductDto,
      image: imageUrl,
      gallery: imagesUrl,
      createdBy: adminId,
    });

    return (await newProduct.save()).populate(
      'brand category createdBy',
      '-password',
    );
  }

  async findAll(): Promise<HProductDocument[]> {
    return await this._productModel
      .find()
      .populate('brand category createdBy', '-password');
  }

  async findOne(id: Types.ObjectId): Promise<HProductDocument> {
    const product = await this._productModel
      .findById(id)
      .populate('brand category createdBy', '-password');

    if (!product) throw new BadRequestException('product not found');

    return product;
  }

  async update(
    id: Types.ObjectId,
    updateProductDto: UpdateProductDto,
    imageUrl?: string,
    imagesUrl?: string[],
  ) {
    if (updateProductDto.brand || updateProductDto.category) {
      const currentProduct = await this._productModel.findById(id);

      if (!currentProduct) {
        throw new NotFoundException('Product not found');
      }

      const brandId = updateProductDto.brand ?? currentProduct.brand.toString();
      const categoryId =
        updateProductDto.category ?? currentProduct.category.toString();

      await this.validateBrandCategoryRelationship(brandId, categoryId);
    }

    const updatedPayload: any = {
      ...updateProductDto,
    };

    if (imageUrl) {
      updatedPayload.image = imageUrl;
    }

    if (imagesUrl) {
      updatedPayload.gallery = imagesUrl;
    }

    const updatedProduct = await this._productModel
      .findByIdAndUpdate(id, updatedPayload, {
        returnDocument: 'after',
        runValidators: true,
      })
      .populate('brand category createdBy', '-password');

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async remove(id: Types.ObjectId) {
    const deletedProduct = await this._productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }

    return {
      message: 'Product deleted successfully',
      product: deletedProduct,
    };
  }
}
