import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { comments, userMutes, posts, userProfiles } from '@server/database/schema';
import { eq, and, asc, sql, isNull, gt, or } from 'drizzle-orm';
import type { Comment as CommentType, CreateCommentRequest } from '@shared/api.interface';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async findByPostId(postId: string): Promise<CommentType[]> {
    try {
      const rows = await this.db
        .select({
          id: comments.id,
          postId: comments.postId,
          content: comments.content,
          author: comments.author,
          authorNickname: userProfiles.nickname,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .leftJoin(userProfiles, sql.raw('(comments.author).user_id = user_profiles.user_id'))
        .where(eq(comments.postId, postId))
        .orderBy(asc(comments.createdAt));

      const allComments: CommentType[] = rows.map((row) => ({
        id: row.id,
        postId: row.postId,
        content: row.content,
        authorId: row.author,
        authorName: row.authorNickname ?? row.author,
        parentId: row.parentId,
        createdAt: row.createdAt.toISOString(),
      }));

      // Build tree structure
      const replyMap = new Map<string | null, CommentType[]>();
      for (const c of allComments) {
        const key = c.parentId ?? null;
        if (!replyMap.has(key)) {
          replyMap.set(key, []);
        }
        replyMap.get(key)!.push(c);
      }

      const roots = replyMap.get(null) ?? [];
      for (const root of roots) {
        root.replies = replyMap.get(root.id) ?? [];
      }

      return roots;
    } catch (error) {
      this.logger.error(`获取评论失败 postId=${postId}`, JSON.stringify(error));
      throw error;
    }
  }

  async create(dto: CreateCommentRequest, userId: string): Promise<CommentType> {
    try {
      if (!dto.postId || !dto.content) {
        throw new BadRequestException('帖子ID和内容不能为空');
      }

      // Check if user is muted
      const isMuted = await this.checkUserMuted(userId);
      if (isMuted) {
        throw new ForbiddenException('您已被禁言，无法发表评论');
      }

      // Verify post exists
      const postRows = await this.db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, dto.postId))
        .limit(1);
      if (postRows.length === 0) {
        throw new NotFoundException('帖子不存在');
      }

      // If parentId provided, verify parent exists
      if (dto.parentId) {
        const parentRows = await this.db
          .select({ id: comments.id, postId: comments.postId })
          .from(comments)
          .where(eq(comments.id, dto.parentId))
          .limit(1);
        if (parentRows.length === 0) {
          throw new BadRequestException('父评论不存在');
        }
        if (parentRows[0].postId !== dto.postId) {
          throw new BadRequestException('父评论不属于该帖子');
        }
      }

       const inserted = await this.db.transaction(async (tx) => {
        const result = await tx
          .insert(comments)
          .values({
            postId: dto.postId,
            content: dto.content,
            author: userId,
            parentId: dto.parentId ?? null,
          })
          .returning({
            id: comments.id,
            postId: comments.postId,
            content: comments.content,
            author: comments.author,
            parentId: comments.parentId,
            createdAt: comments.createdAt,
          });

        await tx
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} + 1` })
          .where(eq(posts.id, dto.postId));

        return result[0];
      });

      const profileRows = await this.db
        .select({ nickname: userProfiles.nickname })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      const authorNickname = profileRows[0]?.nickname ?? userId;

      return {
        id: inserted.id,
        postId: inserted.postId,
        content: inserted.content,
        authorId: inserted.author,
        authorName: authorNickname,
        parentId: inserted.parentId,
        createdAt: inserted.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('创建评论失败', JSON.stringify(error));
      throw error;
    }
  }

  private async checkUserMuted(userId: string): Promise<boolean> {
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
