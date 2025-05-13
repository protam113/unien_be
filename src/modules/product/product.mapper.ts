import { DataResponse } from './responses/product.response';
import { ProductStatus } from './product.constant';
import { ProductDocument } from 'src/entities/product.entity';

export function toDataResponse(
  product: Partial<ProductDocument>,
): DataResponse {
  return {
    _id: product._id?.toString() ?? '',
    title: product.title ?? '',
    file: product.file ?? [],
    slug: product.slug ?? '',
    content: product.content ?? '',
    description: product.description ?? '',
    category: {
      _id: product.category?._id?.toString() ?? '',
      name: product.category?.name ?? '',
    },
    price: product.price,
    views: product.views ?? 0,
    user: product.user ?? {},
    status: product.status as ProductStatus,
    createdAt: product.createdAt || new Date(),
    updatedAt: product.updatedAt || new Date(),
  };
}
