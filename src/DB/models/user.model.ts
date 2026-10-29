import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  GenderEnum,
  ProviderEnum,
  RoleEnum,
} from '../../common/enums/user.enum.js';
import { HydratedDocument } from 'mongoose';
import { hash } from '../../common/security/hash.js';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({
    type: String,
    required: true,
    minLength: 2,
    maxLength: 20,
    trim: true,
  })
  firstName: string;

  @Prop({
    type: String,
    required: true,
    minLength: 2,
    maxLength: 20,
    trim: true,
  })
  lastName: string;

  userName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    type: Date,
  })
  confirmEmail: Date;

  @Prop({
    type: String,
    default: undefined,
  })
  confirmEmailOTP: string | undefined;

  @Prop({
    type: Date,
    default: undefined,
  })
  otpExpiresAt: Date | undefined;

  @Prop({
    type: String,
    required: function (this: any) {
      return this.provider === ProviderEnum.SYSTEM;
    },
  })
  password: string;

  @Prop({
    type: String,
    enum: {
      values: Object.values(ProviderEnum),
      message: '{VALUE} is not a valid provider',
    },
    default: ProviderEnum.SYSTEM,
  })
  provider: ProviderEnum;

  @Prop({
    type: String,
    enum: {
      values: Object.values(GenderEnum),
      message: '{VALUE} is not a valid gender',
    },
    default: GenderEnum.MALE,
  })
  gender: string;

  @Prop({
    type: String,
    enum: {
      values: Object.values(RoleEnum),
      message: '{VALUE} is not a valid Role',
    },
    default: RoleEnum.USER,
  })
  role: string;

  @Prop({ type: String })
  profilePic: string;

  @Prop({ type: [String] })
  coverPic: [string];

  // new

  @Prop({ type: String, default: undefined })
  forgetPasswordOTP: string | undefined;

  @Prop({ type: Date, default: undefined })
  forgetPasswordOTPExpiresAt: Date | undefined;
}

export const userSchema = SchemaFactory.createForClass(User);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await hash(this.password);
  }
});

userSchema
  .virtual('userName')
  .get(function (this: any) {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function (this: any, value: string) {
    const [firstName, lastName] = value.split(' ') || [];
    this.firstName = firstName;
    this.lastName = lastName;
  });

export type HUserDocument = HydratedDocument<User>;

export const UserModel = MongooseModule.forFeature([
  { name: User.name, schema: userSchema },
]);
