import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { posts, categories, userMutes, userProfiles } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, sql, isNull, gt, or } from 'drizzle-orm';
import type {
  Post as PostType,
  PostListResponse,
  PostListRequest,
  CreatePostRequest,
} from '@shared/api.interface';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async findList(query: PostListRequest): Promise<PostListResponse> {
    try {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10));
      const sortBy = query.sortBy ?? 'latest';

      const conditions = [eq(posts.status, 'published')];

      if (query.categoryId) {
        conditions.push(eq(posts.categoryId, query.categoryId));
      }

      if (query.keyword) {
        conditions.push(ilike(posts.title, `%${query.keyword}%`));
      }

      const whereClause = and(...conditions);

      const [totalResult, rows] = await Promise.all([
        this.db
          .select({ count: count() })
          .from(posts)
          .where(whereClause),
        this.db
          .select({
            id: posts.id,
            title: posts.title,
            content: posts.content,
            categoryId: posts.categoryId,
            categoryName: categories.name,
            author: posts.author,
            authorNickname: userProfiles.nickname,
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
          .leftJoin(userProfiles, sql.raw('(posts.author).user_id = user_profiles.user_id'))
          .where(whereClause)
          .orderBy(
            sortBy === 'hot'
              ? desc(sql`${posts.likeCount} + ${posts.commentCount} + ${posts.viewCount}`)
              : desc(posts.createdAt),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

      const total = totalResult[0]?.count ?? 0;

      const items: PostType[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? '',
        authorId: row.author,
        authorName: row.authorNickname ?? row.author,
        status: row.status,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
         favoriteCount: row.favoriteCount,
         images: row.images ?? [],
         createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));

      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.error('获取帖子列表失败', JSON.stringify(error));
      throw error;
    }
  }

  async findById(id: string): Promise<PostType> {
    try {
       const rows = await this.db
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          categoryId: posts.categoryId,
          categoryName: categories.name,
          author: posts.author,
          authorNickname: userProfiles.nickname,
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
        .leftJoin(userProfiles, sql.raw('(posts.author).user_id = user_profiles.user_id'))
        .where(eq(posts.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException('帖子不存在');
      }

      const row = rows[0];

      // Increment view count
      await this.db
        .update(posts)
        .set({ viewCount: sql`${posts.viewCount} + 1` })
        .where(eq(posts.id, id));

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? '',
        authorId: row.author,
        authorName: row.authorNickname ?? row.author,
        status: row.status,
        viewCount: row.viewCount + 1,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
         favoriteCount: row.favoriteCount,
         images: row.images ?? [],
         createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`获取帖子详情失败 id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async create(dto: CreatePostRequest, userId: string): Promise<PostType> {
    try {
      if (!dto.title || !dto.content || !dto.categoryId) {
        throw new BadRequestException('标题、内容和分类不能为空');
      }

      // Check if user is muted
      const isMuted = await this.checkUserMuted(userId);
      if (isMuted) {
        throw new ForbiddenException('您已被禁言，无法发布帖子');
      }

      // Verify category exists
      const categoryRows = await this.db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.id, dto.categoryId))
        .limit(1);

      if (categoryRows.length === 0) {
        throw new BadRequestException('分类不存在');
      }

       const inserted = await this.db
         .insert(posts)
         .values({
           title: dto.title,
           content: dto.content,
           categoryId: dto.categoryId,
           author: userId,
           status: 'published',
           images: dto.imageUrls ?? [],
         })
         .returning({
           id: posts.id,
           title: posts.title,
           content: posts.content,
           categoryId: posts.categoryId,
           author: posts.author,
           status: posts.status,
           viewCount: posts.viewCount,
           likeCount: posts.likeCount,
           commentCount: posts.commentCount,
           favoriteCount: posts.favoriteCount,
           images: posts.images,
           createdAt: posts.createdAt,
           updatedAt: posts.updatedAt,
         });

      const row = inserted[0];

      const profileRows = await this.db
        .select({ nickname: userProfiles.nickname })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      const authorNickname = profileRows[0]?.nickname ?? userId;

       return {
         id: row.id,
         title: row.title,
         content: row.content,
         categoryId: row.categoryId,
         categoryName: categoryRows[0].name,
         authorId: row.author,
         authorName: authorNickname,
         status: row.status,
         viewCount: row.viewCount,
         likeCount: row.likeCount,
         commentCount: row.commentCount,
         favoriteCount: row.favoriteCount,
         images: row.images ?? [],
         createdAt: row.createdAt.toISOString(),
         updatedAt: row.updatedAt.toISOString(),
       };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('创建帖子失败', JSON.stringify(error));
      throw error;
    }
  }

  async isAuthor(postId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), sql`(posts.author).user_id = ${userId}`))
      .limit(1);
    return rows.length > 0;
  }

  async remove(id: string): Promise<void> {
    try {
      const deleted = await this.db
        .delete(posts)
        .where(eq(posts.id, id))
        .returning({ id: posts.id });

      if (deleted.length === 0) {
        throw new NotFoundException('帖子不存在');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`删除帖子失败 id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async incrementCommentCount(postId: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async checkUserMuted(userId: string): Promise<boolean> {
    const nowIso = new Date().toISOString();
      const rows = await this.db
        .select({ id: userMutes.id })
        .from(userMutes)
        .where(
          and(
            sql`(user_mutes.user_id).user_id = ${userId}`,
            or(isNull(userMutes.expiresAt), gt(userMutes.expiresAt, new Date())),
          ),
        )
        .limit(1);
    return rows.length > 0;
  }
}
