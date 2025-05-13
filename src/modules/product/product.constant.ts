export const INITIAL_COUNT_OF_EACH_STATUS = 0;

export enum Error {
  PRICE_VALIDATION = 'PRICE_VALIDATION',
  FILE_REQUIRED = 'FILE_REQUIRED',
  PRODUCT_ALREADY_EXIT = 'PRODUCT_ARRAY_EXIT',
  NOT_FOUND = 'NOT_FOUND',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  INVALID_STATUS = 'INVALID_STATUS',
  CATEGORY_VALIDATION = 'CATEGORY_VALIDATION',

  TITLE_REQUIRED = 'TITLE_REQUIRED',
}

export enum Success {
  Created = 'Product created successfully',
  Updated = 'Product updated successfully',
  Deleted = 'Product deleted successfully',
}

export enum Message {
  ProductNotFound = 'Product not found',
  ThisProductAlreadyExists = 'This Product already exists',
  ProductCreatedSuccessfully = 'Product created successfully',
  ProductUpdatedSuccessfully = 'Product updated successfully',
  ProductDeletedSuccessfully = 'Product deleted successfully',
  ValidPrice = 'Price must be a valid number',
  FileRequired = 'File is required',
  FailedUploadImage = 'File upload failed',
  InvalidStatus = 'Invalid status value',
  InvalidViewsCount = 'Invalid views count',
  CategoryValidation = 'Category validation failed',
}

export enum Product {
  Success = 'SUCCESS',
}

export enum ProductStatus {
  Show = 'show',
  Hide = 'hide',
  Popular = 'popular',
  Draft = 'draft',
}

export const Product_CACHE_TTL = {
  Product_LIST: 3600,
  Product_DETAIL: 10800,
};
