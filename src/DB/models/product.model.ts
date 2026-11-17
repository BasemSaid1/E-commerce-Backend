import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class ProductOption {
  @Prop({ type: String, required: true, trim: true, maxlength: 30 })
  name: string;

  @Prop({ type: [String], required: true })
  values: string[];
}

@Schema({ _id: false })
export class VariantAttribute {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, trim: true })
  value: string;
}

@Schema()
export class ProductVariant {
  _id: Types.ObjectId;

  @Prop({
    type: [SchemaFactory.createForClass(VariantAttribute)],
    required: true,
  })
  attributes: VariantAttribute[];

  @Prop({ type: Number, required: true, min: 1 })
  price: number;

  @Prop({ type: Number, required: true, min: 0 })
  stock: number;
}

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

  @Prop({ type: [SchemaFactory.createForClass(ProductOption)], default: [] })
  options: ProductOption[];

  @Prop({ type: [SchemaFactory.createForClass(ProductVariant)], default: [] })
  variants: ProductVariant[];

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
