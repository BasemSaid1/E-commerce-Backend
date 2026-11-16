import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join, resolve } from 'node:path';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthModule } from './auth/auth.module.js';
import { MailModule } from './mail/mail.module.js';
import { LoggerMiddleware } from './common/middlewares/logger.middleware.js';
import { AuthController } from './auth/auth.controller.js';
import { CategoryModule } from './category/category.module.js';
import { BrandModule } from './brand/brand.module.js';
import { ProductModule } from './product/product.module.js';
import { CartModule } from './cart/cart.module.js';
import { ReviewModule } from './review/review.module.js';
import { CouponModule } from './coupon/coupon.module.js';
import { CachingModule } from './caching/caching.module.js';
import { OrderModule } from './order/order.module.js';
import { SocketModule } from './socket/socket.module.js';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import type { Request } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve('./config/.env'),
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
        onConnectionCreate: (connection: Connection) => {
          connection.on('connected', () => console.log('DB Connected'));
        },
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    AuthModule,
    MailModule,
    CategoryModule,
    BrandModule,
    ProductModule,
    CartModule,
    ReviewModule,
    CouponModule,
    CachingModule,
    OrderModule,
    SocketModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(AuthController);
  }

  onModuleInit() {
    console.log('1- Module initialized');
  }

  onApplicationBootstrap() {
    console.log('2- Application bootstrapped');
  }

  onModuleDestroy() {
    console.log('3- Module destroyed');
  }

  beforeApplicationShutdown(signal?: string) {
    console.log('4- Shutdown signal:', signal);
  }

  onApplicationShutdown(signal?: string) {
    console.log('5- Application shutting down', signal);
  }
}
