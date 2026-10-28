import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { Category } from '@shared/api.interface';

export async function listCategories(): Promise<Category[]> {
  try {
    const response = await axiosForBackend.get<Category[]>('/api/categories');
    return response.data;
  } catch (error: unknown) {
    logger.error('listCategories failed', error);
    throw error;
  }
}
