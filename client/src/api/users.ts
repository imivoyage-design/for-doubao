import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { UserProfileInfo, PostListResponse } from '@shared/api.interface';

export async function getProfile(): Promise<UserProfileInfo> {
  try {
    const response = await axiosForBackend.get<UserProfileInfo>('/api/users/profile');
    return response.data;
  } catch (error: unknown) {
    logger.error('getProfile failed', error);
    throw error;
  }
}

export async function getUserPosts(
  userId: string,
  page = 1,
  pageSize = 10,
): Promise<PostListResponse> {
  try {
    const response = await axiosForBackend.get<PostListResponse>(
      `/api/users/${userId}/posts`,
      { params: { page, pageSize } },
    );
    return response.data;
  } catch (error: unknown) {
    logger.error(`getUserPosts failed for user ${userId}`, error);
    throw error;
  }
}

export async function getMyFavorites(
  page = 1,
  pageSize = 10,
): Promise<PostListResponse> {
  try {
    const response = await axiosForBackend.get<PostListResponse>(
      '/api/users/favorites',
      { params: { page, pageSize } },
    );
    return response.data;
  } catch (error: unknown) {
    logger.error('getMyFavorites failed', error);
    throw error;
  }
}
