import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export async function toggleLike(
  postId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  try {
    const response = await axiosForBackend.post<{ liked: boolean; likeCount: number }>(
      `/api/likes/${postId}`,
    );
    return response.data;
  } catch (error: unknown) {
    logger.error(`toggleLike failed for post ${postId}`, error);
    throw error;
  }
}

export async function getLikeStatus(postId: string): Promise<{ liked: boolean }> {
  try {
    const response = await axiosForBackend.get<{ liked: boolean }>(
      `/api/likes/${postId}/status`,
    );
    return response.data;
  } catch (error: unknown) {
    logger.error(`getLikeStatus failed for post ${postId}`, error);
    throw error;
  }
}
