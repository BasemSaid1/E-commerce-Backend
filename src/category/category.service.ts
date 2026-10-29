import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Category, HCategoryDocument } from '../DB/models/category.model.js';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly _categoryModel: Model<HCategoryDocument>,
  ) {}

  create(
    createCategoryDto: CreateCategoryDto,
    logoUrl: string,
    adminId: Types.ObjectId,
  ) {
    const newCategory = new this._categoryModel({
      ...createCategoryDto,
      logo: logoUrl,
      createdBy: adminId,
    });

    return newCategory.save();
  }

  findAll() {
    return this._categoryModel.find();
  }

  findOne(id: string) {
    return this._categoryModel.findById(id);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    logoUrl?: string,
  ) {
    const updateedPayload: any = { ...updateCategoryDto };

    if (logoUrl) updateedPayload.logo = logoUrl;

    const updatedCategory = await this._categoryModel
      .findByIdAndUpdate(id, updateedPayload, { returnDocument: 'after' })
      .populate('createdBy', '-password');

    if (!updatedCategory) throw new NotFoundException('category not found');

    return updatedCategory;
  }

  async remove(id: Types.ObjectId) {
    const deletedCategory = await this._categoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      throw new NotFoundException('Category not found');
    }

    return {
      message: 'Category deleted successfully',
      category: deletedCategory,
    };
  }
}
