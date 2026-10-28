import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { Comment, CreateCommentRequest } from '@shared/api.interface';

export async function listComments(postId: string): Promise<Comment[]> {
  try {
    const response = await axiosForBackend.get<Comment[]>('/api/comments', {
      params: { postId },
    });
    return response.data;
  } catch (error: unknown) {
    logger.error(`listComments failed for post ${postId}`, error);
    throw error;
  }
}

export async function createComment(data: CreateCommentRequest): Promise<Comment> {
  try {
    const response = await axiosForBackend.post<Comment>('/api/comments', data);
    return response.data;
  } catch (error: unknown) {
    logger.error('createComment failed', error);
    throw error;
  }
}
