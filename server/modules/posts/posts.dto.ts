import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import type { CreatePostRequest } from '@shared/api.interface';

export class CreatePostDto implements CreatePostRequest {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(9)
  imageUrls?: string[];
}
