import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Post,
  PostListRequest,
  PostListResponse,
  CreatePostRequest,
} from '@shared/api.interface';

export async function listPosts(params: PostListRequest): Promise<PostListResponse> {
  try {
    const response = await axiosForBackend.get<PostListResponse>('/api/posts', {
      params,
    });
    return response.data;
  } catch (error: unknown) {
    logger.error('listPosts failed', error);
    throw error;
  }
}

export async function getPost(id: string): Promise<Post> {
  try {
    const response = await axiosForBackend.get<Post>(`/api/posts/${id}`);
    return response.data;
  } catch (error: unknown) {
    logger.error(`getPost failed for id ${id}`, error);
    throw error;
  }
}

export async function createPost(data: CreatePostRequest): Promise<Post> {
  try {
    const response = await axiosForBackend.post<Post>('/api/posts', data);
    return response.data;
  } catch (error: unknown) {
    logger.error('createPost failed', error);
    throw error;
  }
}

export async function deletePost(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/posts/${id}`);
  } catch (error: unknown) {
    logger.error(`deletePost failed for id ${id}`, error);
    throw error;
  }
}
