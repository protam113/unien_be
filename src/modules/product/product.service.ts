import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { MediaService } from '../media/media.service';
import { SlugProvider } from '../slug/slug.provider';
import { RedisCacheService } from '../cache/redis-cache.service';

import { Model } from 'mongoose';
import { Pagination } from '../paginate/pagination';
import { PaginationOptionsInterface } from '../paginate/pagination.options.interface';
import { UserData } from '../user/user.interface';
import { DataResponse } from './responses/product.response';
import { DetailResponse } from './responses/detail.response';

import {
  Error,
  Message,
  Product_CACHE_TTL,
  ProductStatus,
} from './product.constant';
import { buildCacheKey } from '../../utils/cache-key.util';
import { StatusCode, StatusType } from 'src/entities/status_code.entity';
import { toDataResponse } from './product.mapper';
import { buildProductFilter } from 'src/helpers/product.helper';
import { CategoryService } from '../category/category.service';
import { ProductDocument, ProductEntity } from 'src/entities/product.entity';
import { CreateProductDto } from './dto/create-product';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(ProductEntity.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly slugProvider: SlugProvider,
    private readonly redisCacheService: RedisCacheService,
    private readonly mediaproduct: MediaService,
    private readonly categoryproduct: CategoryService,
  ) {}

  async findAll(
    options: PaginationOptionsInterface,
    startDate?: string,
    endDate?: string,
    status?: ProductStatus,
    category?: string,
  ): Promise<Pagination<DataResponse>> {
    const cacheKey = buildCacheKey('products', {
      page: options.page,
      limit: options.limit,
      start: startDate,
      end: endDate,
      status: status || 'all',
      category: category || 'all',
    });
    const cached =
      await this.redisCacheService.get<Pagination<DataResponse>>(cacheKey);

    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    const filter = buildProductFilter({ startDate, endDate, status, category });

    const products = await this.productModel
      .find(filter)
      .skip((options.page - 1) * options.limit)
      .sort({ createdAt: -1 })
      .limit(options.limit)
      .exec();

    const total = await this.productModel.countDocuments(filter);

    const results = products.map(toDataResponse);

    const result = new Pagination<DataResponse>({
      results,
      total,
      total_page: Math.ceil(total / options.limit),
      page_size: options.limit,
      current_page: options.page,
    });

    await this.redisCacheService.set(
      cacheKey,
      result,
      Product_CACHE_TTL.Product_LIST,
    );
    return result;
  }

  async create(
    createproductDto: CreateProductDto,
    user: UserData,
    files?: Express.Multer.File[],
  ): Promise<DetailResponse> {
    const { title, content, description, price, category, status } =
      createproductDto;

    // Validate title
    if (!title || title.trim() === '') {
      throw new BadRequestException({
        message: 'Title is required to generate slug',
        error: Error.TITLE_REQUIRED,
      });
    }

    // Generate unique slug
    const slug = this.slugProvider.generateSlug(title, { unique: true });

    const [exists, isValidCategory] = await Promise.all([
      this.productModel.findOne({ $or: [{ title }, { slug }] }),
      this.categoryproduct.validateProductCategory(category),
    ]);

    if (!isValidCategory)
      throw new BadRequestException({
        message: Message.CategoryValidation,
        error: Error.CATEGORY_VALIDATION,
      });

    if (exists) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.ThisProductAlreadyExists,
        error: Error.PRODUCT_ALREADY_EXIT,
      });
    }

    const parsedPrice = Number(price);
    if (price && isNaN(parsedPrice)) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.ValidPrice,
        error: Error.PRICE_VALIDATION,
      });
    }

    if (!files || files.length === 0) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.FileRequired,
        error: Error.FILE_REQUIRED,
      });
    }

    const folderPath = '/product';
    let imageUrls: string[] = [];

    try {
      const uploadedImages = await this.mediaproduct.uploadMultipleFiles(
        folderPath,
        files,
      );
      imageUrls = uploadedImages.urls; // 🔧 dùng `urls` chứ không phải `url`
    } catch (error) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.FailedUploadImage,
        error: Error.FILE_UPLOAD_FAILED,
      });
    }

    const newproduct = new this.productModel({
      title,
      slug,
      content,
      description,
      price: parsedPrice,
      category,
      file: imageUrls,
      status: status || ProductStatus.Draft,
      user: {
        userId: user._id,
        username: user.username,
        role: user.role,
      },
    });

    await this.redisCacheService.delByPattern('products*');
    await this.redisCacheService.del(`products_${slug}`);

    await newproduct.save();
    return {
      status: StatusType.Success,
      result: newproduct,
    };
  }

  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (result) {
      await this.redisCacheService.delByPattern('products*');
      await this.redisCacheService.del(`product_${id}`);
    } else {
      // If the blog wasn't found, throw a clear error
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.ProductNotFound,
        error: Error.NOT_FOUND,
      });
    }
  }

  async updateStatus(
    id: string,
    status: ProductStatus,
  ): Promise<ProductDocument> {
    if (!Object.values(ProductStatus).includes(status)) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.InvalidStatus,
        error: Error.INVALID_STATUS,
      });
    }

    const product = await this.productModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!product) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.ProductNotFound,
        error: Error.NOT_FOUND,
      });
    }
    await this.redisCacheService.delByPattern('products*');
    await this.redisCacheService.del(`product_${id}`);

    return product;
  }

  async findBySlug(slug: string): Promise<DetailResponse> {
    const cacheKey = `product_${slug}`;
    const cached = await this.redisCacheService.get<DetailResponse>(cacheKey);

    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    const product = await this.productModel.findOne({ slug }).exec();

    if (!product) {
      throw new BadRequestException({
        statusCode: StatusCode.BadRequest,
        message: Message.ProductNotFound,
        error: Error.NOT_FOUND,
      });
    }
    const result = toDataResponse(product);

    await this.redisCacheService.set(
      cacheKey,
      result,
      Product_CACHE_TTL.Product_DETAIL,
    );
    return {
      status: 'success',
      result: result,
    };
  }

  async validateproduct(productId: string): Promise<boolean> {
    try {
      const product = await this.productModel.findById(productId).exec();
      return !!product;
    } catch (error) {
      this.logger.error(`Error validating product: ${error.message}`);
      return false;
    }
  }

  async validateproducts(productIds: string[]): Promise<boolean> {
    try {
      const count = await this.productModel
        .countDocuments({
          _id: { $in: productIds },
        })
        .exec();

      return count === productIds.length;
    } catch (error) {
      this.logger.error(`Error validating products: ${error.message}`);
      return false;
    }
  }

  async updateView(slug: string, newViews: number): Promise<ProductDocument> {
    if (newViews < 0) {
      throw new BadRequestException(Message.InvalidViewsCount);
    }

    // Tìm và cập nhật blog theo slug
    const project = await this.productModel.findOneAndUpdate(
      { slug },
      { $inc: { views: newViews } },
      { new: true },
    );

    if (!project) {
      throw new NotFoundException(Message.ProductNotFound);
    }

    await this.redisCacheService
      .reset()
      .catch((err) => this.logger.error('Failed to clear cache:', err));

    return project;
  }
}
