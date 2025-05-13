import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemLogModule } from '../system-log/system-log.module';
import { SlugProvider } from '../slug/slug.provider';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { RedisCacheModule } from '../cache/redis-cache.module';
import { MediaModule } from '../media/media.module';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { ProductEntity, ProductSchema } from '../../entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductEntity.name, schema: ProductSchema },
    ]),
    SystemLogModule,
    AuthModule,
    MediaModule,
    RedisCacheModule,
    CategoryModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, SlugProvider],
  exports: [ProductService],
})
export class ProductModule {}
