import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { posts, comments, postLikes, postFavorites, userMutes, categories, userProfiles } from '@server/database/schema';
import { eq, and, sql, count, desc, isNull, gt, or } from 'drizzle-orm';
import type {
  UserProfileInfo,
  PostListResponse,
  Post as PostType,
} from '@shared/api.interface';

interface PaginationParams {
  page: number;
  pageSize: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getProfile(userId: string): Promise<UserProfileInfo> {
    try {
      const [profileResult, postCountResult, commentCountResult, likedCountResult, muteResult] =
        await Promise.all([
          this.db
            .select({
              nickname: userProfiles.nickname,
              avatarUrl: userProfiles.avatarUrl,
              bio: userProfiles.bio,
              role: userProfiles.role,
            })
            .from(userProfiles)
            .where(eq(userProfiles.userId, userId))
            .limit(1),
          this.db
            .select({ count: count() })
            .from(posts)
            .where(
              and(
                sql`(posts.author).user_id = ${userId}`,
                eq(posts.status, 'published'),
              ),
            ),
          this.db
            .select({ count: count() })
            .from(comments)
            .where(sql`(comments.author).user_id = ${userId}`),
          // Sum of like_count on all posts authored by this user
          this.db
            .select({
              total: sql<number>`COALESCE(SUM(${posts.likeCount}), 0)`,
            })
            .from(posts)
            .where(
              and(
                sql`(posts.author).user_id = ${userId}`,
                eq(posts.status, 'published'),
              ),
            ),
          this.db
            .select({
              id: userMutes.id,
              reason: userMutes.reason,
            })
            .from(userMutes)
            .where(
              and(
                sql`(user_mutes.user_id).user_id = ${userId}`,
                or(isNull(userMutes.expiresAt), gt(userMutes.expiresAt, new Date())),
              ),
            )
            .limit(1),
        ]);

      const profile = profileResult[0];
      const postCount = Number(postCountResult[0]?.count ?? 0);
      const commentCount = Number(commentCountResult[0]?.count ?? 0);
      const likedCount = Number(likedCountResult[0]?.total ?? 0);
      const isMuted = muteResult.length > 0;
      const muteReason = isMuted ? muteResult[0].reason ?? null : null;

      return {
        userId,
        userName: profile?.nickname ?? userId,
        nickname: profile?.nickname ?? userId,
        avatarUrl: profile?.avatarUrl ?? null,
        bio: profile?.bio ?? null,
        role: profile?.role ?? 'user',
        postCount,
        commentCount,
        likedCount,
        isMuted,
        muteReason,
      };
    } catch (error) {
      this.logger.error(`获取用户资料失败 userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }

  async getUserPosts(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PostListResponse> {
    try {
      const page = Math.max(1, pagination.page);
      const pageSize = Math.min(50, Math.max(1, pagination.pageSize));

      const whereClause = and(
        sql`(posts.author).user_id = ${userId}`,
        eq(posts.status, 'published'),
      );

      const [totalResult, rows] = await Promise.all([
        this.db.select({ count: count() }).from(posts).where(whereClause),
        this.db
          .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            categoryId: posts.categoryId,
            categoryName: categories.name,
            author: posts.author,
            status: posts.status,
            viewCount: posts.viewCount,
            likeCount: posts.likeCount,
             commentCount: posts.commentCount,
             favoriteCount: posts.favoriteCount,
             images: posts.images,
             createdAt: posts.createdAt,
             updatedAt: posts.updatedAt,
           })
           .from(posts)
           .leftJoin(categories, eq(posts.categoryId, categories.id))
           .where(whereClause)
          .orderBy(desc(posts.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);

      const items: PostType[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? '',
        authorId: row.author,
        authorName: row.author,
        status: row.status,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        favoriteCount: row.favoriteCount,
        images: (row as { images?: string[] }).images ?? [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));

      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.error('获取用户帖子列表失败', JSON.stringify(error));
      throw error;
    }
  }

  async getFavoritePosts(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PostListResponse> {
    try {
      const page = Math.max(1, pagination.page);
      const pageSize = Math.min(50, Math.max(1, pagination.pageSize));

      const favoriteCondition = sql`(post_favorites.user_id).user_id = ${userId}`;

      const [totalResult, rows] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(postFavorites)
          .where(favoriteCondition),
        this.db
          .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            categoryId: posts.categoryId,
            categoryName: categories.name,
            author: posts.author,
            status: posts.status,
            viewCount: posts.viewCount,
            likeCount: posts.likeCount,
             commentCount: posts.commentCount,
             favoriteCount: posts.favoriteCount,
             images: posts.images,
             createdAt: posts.createdAt,
             updatedAt: posts.updatedAt,
             favoritedAt: postFavorites.createdAt,
          })
          .from(postFavorites)
          .innerJoin(posts, eq(postFavorites.postId, posts.id))
          .leftJoin(categories, eq(posts.categoryId, categories.id))
          .where(and(favoriteCondition, eq(posts.status, 'published')))
          .orderBy(desc(postFavorites.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);

      const items: PostType[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? '',
        authorId: row.author,
        authorName: row.author,
        status: row.status,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        favoriteCount: row.favoriteCount,
        images: (row as { images?: string[] }).images ?? [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));

      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.error(`获取用户收藏列表失败 userId=${userId}`, JSON.stringify(error));
      throw error;
    }
  }
}
