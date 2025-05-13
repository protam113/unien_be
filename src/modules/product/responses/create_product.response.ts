import { ProductDocument } from 'src/entities/product.entity';

export interface CreateProductResponse {
  status: string;
  result: ProductDocument;
}
