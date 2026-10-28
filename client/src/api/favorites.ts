import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export async function toggleFavorite(
  postId: string,
): Promise<{ favorited: boolean; favoriteCount: number }> {
  try {
    const response = await axiosForBackend.post<{
      favorited: boolean;
      favoriteCount: number;
    }>(`/api/favorites/${postId}`);
    return response.data;
  } catch (error: unknown) {
    logger.error(`toggleFavorite failed for post ${postId}`, error);
    throw error;
  }
}

export async function getFavoriteStatus(
  postId: string,
): Promise<{ favorited: boolean }> {
  try {
    const response = await axiosForBackend.get<{ favorited: boolean }>(
      `/api/favorites/${postId}/status`,
    );
    return response.data;
  } catch (error: unknown) {
    logger.error(`getFavoriteStatus failed for post ${postId}`, error);
    throw error;
  }
}
