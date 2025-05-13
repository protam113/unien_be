import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ProductStatus } from '../product.constant';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  status?: ProductStatus;
}
