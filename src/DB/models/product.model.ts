import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: String,
    required: true,
    minLength: 2,
    maxLength: 200,
    trim: true,
  })
  title: string;

  @Prop({
    type: String,
    trim: true,
  })
  description: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  price: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  stock: number;

  @Prop({
    type: String,
    required: true,
  })
  image: string;

  @Prop([
    {
      type: String,
    },
  ])
  gallery: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'Category',
  })
  category: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'Brand',
  })
  brand: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  createdBy: Types.ObjectId;
}

export const productSchema = SchemaFactory.createForClass(Product);

export type HProductDocument = HydratedDocument<Product>;

export const ProductModel = MongooseModule.forFeature([
  { name: Product.name, schema: productSchema },
]);
