export interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isFavorited?: boolean;
  isMuted?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  createdAt: string;
  replies?: Comment[];
}

export interface MutedUser {
  id: string;
  userId: string;
  userName: string;
  username: string;
  nickname: string;
  reason: string | null;
  mutedBy: string;
  mutedByName: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PostListRequest {
  categoryId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'latest' | 'hot';
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: string;
  imageUrls?: string[];
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentId?: string;
}

export interface AuthUser {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  isMuted: boolean;
  muteReason?: string | null;
  createdAt: string;
}

export interface UserProfileInfo {
  userId: string;
  userName: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  postCount: number;
  commentCount: number;
  likedCount: number;
  isMuted: boolean;
  muteReason?: string | null;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AdminMuteUserRequest {
  userId: string;
  reason?: string;
  expiresAt?: string;
}

export interface AdminUpdatePostCategoryRequest {
  categoryId: string;
}

export interface AdminUser {
  userId: string;
  username: string;
  nickname: string;
  role: string;
  avatarUrl: string | null;
  isMuted: boolean;
  muteReason: string | null;
  muteExpiresAt: string | null;
  createdAt: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}
