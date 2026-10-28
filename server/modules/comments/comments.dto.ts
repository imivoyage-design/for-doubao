import type { CreateCommentRequest } from '@shared/api.interface';

export class CreateCommentDto implements CreateCommentRequest {
  postId!: string;
  content!: string;
  parentId?: string;
}
