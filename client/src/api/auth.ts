import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AuthUser,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
} from '@shared/api.interface';

export async function register(dto: RegisterRequest): Promise<AuthUser> {
  try {
    const response = await axiosForBackend.post<AuthUser>('/api/auth/register', dto);
    return response.data;
  } catch (error: unknown) {
    logger.error('register failed', error);
    throw error;
  }
}

export async function login(dto: LoginRequest): Promise<AuthUser> {
  try {
    const response = await axiosForBackend.post<AuthUser>('/api/auth/login', dto, {
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    logger.error('login failed', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await axiosForBackend.post('/api/auth/logout', {}, { withCredentials: true });
  } catch (error: unknown) {
    logger.error('logout failed', error);
  }
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const response = await axiosForBackend.get<AuthUser>('/api/auth/me', {
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      return null;
    }
    logger.error('getMe failed', error);
    return null;
  }
}

export async function updateProfile(dto: UpdateProfileRequest): Promise<AuthUser> {
  try {
    const response = await axiosForBackend.patch<AuthUser>('/api/auth/profile', dto, {
      withCredentials: true,
    });
    return response.data;
  } catch (error: unknown) {
    logger.error('updateProfile failed', error);
    throw error;
  }
}
