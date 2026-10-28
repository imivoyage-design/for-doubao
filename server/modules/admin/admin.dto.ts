import type { AdminMuteUserRequest, AdminUpdatePostCategoryRequest } from '@shared/api.interface';

export class AdminMuteUserDto implements AdminMuteUserRequest {
  userId!: string;
  reason?: string;
  expiresAt?: string;
}

export class AdminUpdatePostCategoryDto implements AdminUpdatePostCategoryRequest {
  categoryId!: string;
}
