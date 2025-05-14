import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Logger,
  UseInterceptors,
  UploadedFile,
  Patch,
  UploadedFiles,
} from '@nestjs/common';
import { SystemLogService } from '../system-log/system-log.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { Status, SystemLogType } from '../../entities/system-log.entity';
import { ProductStatus } from './product.constant';
import { CreateProductDto } from './dto/create-product';
import { ProductService } from './product.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../auth/guards/RolesGuard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller({ path: 'product', version: '1' })
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly systemLogService: SystemLogService,
  ) {}

  @Get()
  async getProducts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: ProductStatus,
    @Query('category') category?: string,
    @Query('sortByPrice') sortByPrice?: string,
  ) {
    this.logger.debug('Fetching products with filters:', {
      startDate,
      endDate,
      page,
      limit,
      status,
      category,
      sortByPrice,
    });

    return this.productService.findAll(
      { page, limit },
      startDate,
      endDate,
      status as ProductStatus,
      category,
      sortByPrice,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const product = await this.productService.create(
      createProductDto,
      req.user,
      files, // 👈 truyền mảng xuống
    );

    await this.systemLogService.log({
      type: SystemLogType.ServiceCreated,
      note: `User ${req.user.email} created a new service post`,
      status: Status.Success,
      data: {
        user: req.user,
        id: product.result._id,
        title: product.result.title,
      },
    });

    return product;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req) {
    await this.productService.delete(id);

    await this.systemLogService.log({
      type: SystemLogType.ServiceDeleted,
      note: `User ${req.user.name} deleted a product`,
      status: Status.Success,
      data: {
        user: req.user,
        productId: id,
        prodctName: req.title,
      },
    });

    return { message: 'Product deleted successfully' };
  }

  @Get(':slug')
  async getServiceBySlug(@Param('slug') slug: string) {
    return this.productService.findBySlug(slug);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor(''))
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
  ) {
    return this.productService.updateStatus(id, status);
  }
}
