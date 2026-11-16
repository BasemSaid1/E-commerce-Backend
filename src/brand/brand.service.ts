import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Brand, HBrandDocument } from '../DB/models/brand.model.js';
import { Category, HCategoryDocument } from '../DB/models/category.model.js';
import { deleteImageByUrl } from '../common/utils/cloudinary.util.js';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name)
    private readonly _brandModel: Model<HBrandDocument>,
    @InjectModel(Category.name)
    private readonly _categoryModel: Model<HCategoryDocument>,
  ) {}

  private rethrow(error: unknown): never {
    if ((error as { code?: number })?.code === 11000) {
      throw new ConflictException('brand name already exists');
    }
    throw error;
  }

  private async verifyCategoriesExists(categoryIds: string[]): Promise<void> {
    const existingCount = await this._categoryModel.countDocuments({
      _id: { $in: categoryIds },
    });

    if (existingCount !== categoryIds.length) {
      throw new BadRequestException(
        'Database integrity failure: one or more provided category IDs do not exists ins db',
      );
    }
  }

  async create(
    createBrandDto: CreateBrandDto,
    logoUrl: string,
    adminId: Types.ObjectId,
  ) {
    await this.verifyCategoriesExists(createBrandDto.categories);

    const newBrand = new this._brandModel({
      ...createBrandDto,
      logo: logoUrl,
      createdBy: adminId,
    });

    const saved = await newBrand.save().catch((error) => this.rethrow(error));
    return saved.populate('categories');
  }

  async update(
    id: Types.ObjectId,
    updateBrandDto: UpdateBrandDto,
    logoUrl?: string,
  ) {
    if (updateBrandDto.categories) {
      await this.verifyCategoriesExists(updateBrandDto.categories);
    }

    const existing = await this._brandModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const updatedPayload: any = { ...updateBrandDto };
    if (logoUrl) updatedPayload.logo = logoUrl;

    const updatedBrand = await this._brandModel
      .findByIdAndUpdate(id, updatedPayload, { returnDocument: 'after' })
      .catch((error) => this.rethrow(error));

    if (!updatedBrand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    if (logoUrl) await deleteImageByUrl(existing.logo);

    return updatedBrand;
  }

  findAll() {
    return this._brandModel
      .find()
      .populate('categories', 'name logo')
      .populate('createdBy', 'firstName lastName email');
  }

  async findOne(id: Types.ObjectId) {
    const brand = await this._brandModel
      .findById(id)
      .populate('categories', 'name logo')
      .populate('createdBy', 'firstName lastName email');

    if (!brand) throw new NotFoundException(`Brand with ID ${id} not found`);

    return brand;
  }

  async remove(id: Types.ObjectId) {
    const deletedBrand = await this._brandModel.findByIdAndDelete(id);

    if (!deletedBrand) {
      throw new NotFoundException('Brand not found');
    }
    await deleteImageByUrl(deletedBrand.logo);

    return {
      message: 'Brand deleted successfully',
      brand: deletedBrand,
    };
  }
}
