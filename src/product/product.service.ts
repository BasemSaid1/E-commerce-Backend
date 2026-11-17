import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HProductDocument, Product } from '../DB/models/product.model.js';
import { Brand, HBrandDocument } from '../DB/models/brand.model.js';
import { CachingService } from '../caching/caching.service.js';
import {
  deleteImageByUrl,
  deleteImagesByUrls,
} from '../common/utils/cloudinary.util.js';
import {
  ProductOptionDto,
  ProductVariantDto,
} from './dto/product-variant.dto.js';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly _productModel: Model<HProductDocument>,
    @InjectModel(Brand.name)
    private readonly _brandModel: Model<HBrandDocument>,
    private readonly _cache: CachingService,
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

  private buildVariants(
    options: ProductOptionDto[],
    variants: ProductVariantDto[],
    existingIds: Set<string> = new Set(),
  ) {
    if (options.length === 0 && variants.length === 0) {
      return { options: [], variants: [], price: 0, stock: 0 };
    }
    if (options.length === 0 || variants.length === 0) {
      throw new BadRequestException(
        'options and variants must be provided together',
      );
    }

    const optionNames = new Set<string>();
    for (const option of options) {
      const key = option.name.toLowerCase();
      if (optionNames.has(key)) {
        throw new BadRequestException(`duplicate option name ${option.name}`);
      }
      optionNames.add(key);

      const values = new Set(option.values.map((v) => v.toLowerCase()));
      if (values.size !== option.values.length) {
        throw new BadRequestException(
          `duplicate values in option ${option.name}`,
        );
      }
    }

    const seen = new Set<string>();
    const built = variants.map((variant) => {
      if (variant.attributes.length !== options.length) {
        throw new BadRequestException(
          'variant attributes must match product options',
        );
      }

      // بنرتّب الصفات بنفس ترتيب الخيارات، وبنتأكد إن القيمة موجودة في الخيار
      const attributes = options.map((option) => {
        const attr = variant.attributes.find((a) => a.name === option.name);
        if (!attr || !option.values.includes(attr.value)) {
          throw new BadRequestException(
            'variant attributes must match product options',
          );
        }
        return { name: option.name, value: attr.value };
      });

      const key = attributes.map((a) => `${a.name}=${a.value}`).join('|');
      if (seen.has(key)) {
        throw new BadRequestException('duplicate variant combination');
      }
      seen.add(key);

      // الـ id القديم بيتحافظ عليه (علشان السلة والطلبات)، والجديد بيتولّد
      const _id =
        variant._id && existingIds.has(variant._id)
          ? new Types.ObjectId(variant._id)
          : new Types.ObjectId();

      return { _id, attributes, price: variant.price, stock: variant.stock };
    });

    return {
      options: options.map((o) => ({ name: o.name, values: o.values })),
      variants: built,
      price: Math.min(...built.map((v) => v.price)),
      stock: built.reduce((sum, v) => sum + v.stock, 0),
    };
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

    // const newProduct = new this._productModel({
    //   ...createProductDto,
    //   image: imageUrl,
    //   gallery: imagesUrl,
    //   createdBy: adminId,
    // });

    const { options, variants, ...rest } = createProductDto;
    const built = this.buildVariants(options ?? [], variants ?? []);
    const hasVariants = built.variants.length > 0;

    if (!hasVariants && rest.price === undefined) {
      throw new BadRequestException('price is required');
    }
    if (!hasVariants && rest.stock === undefined) {
      throw new BadRequestException('stock is required');
    }

    const newProduct = new this._productModel({
      ...rest,
      price: hasVariants ? built.price : rest.price,
      stock: hasVariants ? built.stock : rest.stock,
      options: built.options,
      variants: built.variants,
      image: imageUrl,
      gallery: imagesUrl,
      createdBy: adminId,
    });

    const saved = await newProduct.save();
    await this._cache.invalidateProducts();

    return saved.populate('brand category', 'name logo');
  }

  async findAll(query: ProductQueryDto) {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = query;

    const filter: Record<string, any> = {};

    // Search
    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          description: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // Category filter
    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    // Brand filter
    if (brand) {
      filter.brand = new Types.ObjectId(brand);
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      if (minPrice !== undefined) {
        filter.price.$gte = minPrice;
      }

      if (maxPrice !== undefined) {
        filter.price.$lte = maxPrice;
      }
    }

    // Stock filter
    if (inStock !== undefined) {
      if (inStock) {
        filter.stock = { $gt: 0 };
      } else {
        filter.stock = { $eq: 0 };
      }
    }

    // Sorting
    let sortOption: Record<string, 1 | -1>;

    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;

      case 'price_desc':
        sortOption = { price: -1 };
        break;

      case 'oldest':
        sortOption = { createdAt: 1 };
        break;

      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this._productModel
        .find(filter)
        .populate('brand category', 'name logo')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),

      this._productModel.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: Types.ObjectId): Promise<HProductDocument> {
    const product = await this._productModel
      .findById(id)
      .populate('brand category', 'name logo');

    if (!product) throw new BadRequestException('product not found');

    return product;
  }

  async update(
    id: Types.ObjectId,
    updateProductDto: UpdateProductDto,
    imageUrl?: string,
    imagesUrl?: string[],
  ) {
    const currentProduct = await this._productModel.findById(id);

    if (!currentProduct) {
      throw new NotFoundException('Product not found');
    }

    if (updateProductDto.brand || updateProductDto.category) {
      const brandId = updateProductDto.brand ?? currentProduct.brand.toString();
      const categoryId =
        updateProductDto.category ?? currentProduct.category.toString();

      await this.validateBrandCategoryRelationship(brandId, categoryId);
    }

    // const updatedPayload: any = {
    //   ...updateProductDto,
    // };

    const { options, variants, ...rest } = updateProductDto;
    const updatedPayload: any = { ...rest };

    if (options !== undefined || variants !== undefined) {
      const existingIds = new Set(
        (currentProduct.variants ?? []).map((v) => v._id.toString()),
      );
      const built = this.buildVariants(
        options ?? [],
        variants ?? [],
        existingIds,
      );

      updatedPayload.options = built.options;
      updatedPayload.variants = built.variants;

      if (built.variants.length > 0) {
        updatedPayload.price = built.price;
        updatedPayload.stock = built.stock;
      } else if (
        currentProduct.variants?.length > 0 &&
        (rest.price === undefined || rest.stock === undefined)
      ) {
        // تحويل منتج من متغيّرات لمنتج عادي لازم له سعر ومخزون
        throw new BadRequestException(
          'price and stock are required when removing variants',
        );
      }
    } else if (currentProduct.variants?.length > 0) {
      // سعر ومخزون المنتج ذو المتغيّرات بيتحسبوا من المتغيّرات بس
      delete updatedPayload.price;
      delete updatedPayload.stock;
    }

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
      .populate('brand category', 'name logo');

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    await this._cache.invalidateProducts();

    if (imageUrl) await deleteImageByUrl(currentProduct.image);
    if (imagesUrl) await deleteImagesByUrls(currentProduct.gallery ?? []);

    return updatedProduct;
  }

  async remove(id: Types.ObjectId) {
    const deletedProduct = await this._productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }
    await this._cache.invalidateProducts();

    await deleteImageByUrl(deletedProduct.image);
    await deleteImagesByUrls(deletedProduct.gallery ?? []);

    return {
      message: 'Product deleted successfully',
      product: deletedProduct,
    };
  }
}
