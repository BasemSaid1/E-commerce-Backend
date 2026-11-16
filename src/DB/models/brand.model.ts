import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Brand {
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
    type: [
      {
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: 'Category',
      },
    ],
  })
  categories: Types.ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  createdBy: Types.ObjectId;
}

export const brandSchema = SchemaFactory.createForClass(Brand);

export type HBrandDocument = HydratedDocument<Brand>;

export const BrandModel = MongooseModule.forFeature([
  { name: Brand.name, schema: brandSchema },
]);
