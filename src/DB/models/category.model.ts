import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Category {
  @Prop({
    type: String,
    unique: true,
    required: true,
    minLength: 2,
    maxLength: 20,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
  })
  logo: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  createdBy: Types.ObjectId;
}

export const categorySchema = SchemaFactory.createForClass(Category);

export type HCategoryDocument = HydratedDocument<Category>;

export const CategoryModel = MongooseModule.forFeature([
  { name: Category.name, schema: categorySchema },
]);
