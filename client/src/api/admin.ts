import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { AdminMuteUserRequest, MutedUser, AdminUserListResponse } from '@shared/api.interface';

export async function updatePostCategory(
  postId: string,
  categoryId: string,
): Promise<void> {
  try {
    await axiosForBackend.patch(`/api/admin/posts/${postId}/category`, {
      categoryId,
    });
  } catch (error: unknown) {
    logger.error(`updatePostCategory failed for post ${postId}`, error);
    throw error;
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/admin/posts/${postId}`);
  } catch (error: unknown) {
    logger.error(`admin deletePost failed for post ${postId}`, error);
    throw error;
  }
}

export async function muteUser(data: AdminMuteUserRequest): Promise<void> {
  try {
    await axiosForBackend.post('/api/admin/mutes', data);
  } catch (error: unknown) {
    logger.error('muteUser failed', error);
    throw error;
  }
}

export async function unmuteUser(userId: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/admin/mutes/${userId}`);
  } catch (error: unknown) {
    logger.error(`unmuteUser failed for user ${userId}`, error);
    throw error;
  }
}

export async function listMutes(): Promise<MutedUser[]> {
  try {
    const response = await axiosForBackend.get<MutedUser[]>('/api/admin/mutes');
    return response.data;
  } catch (error: unknown) {
    logger.error('listMutes failed', error);
    throw error;
  }
}

export async function listUsers(options: {
  page: number;
  pageSize?: number;
  keyword?: string;
}): Promise<AdminUserListResponse> {
  try {
    const params = new URLSearchParams();
    params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.keyword) params.set('keyword', options.keyword);
    const response = await axiosForBackend.get<AdminUserListResponse>(
      `/api/admin/users?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    logger.error('listUsers failed', error);
    throw error;
  }
}
