import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { postLikes, posts } from '@server/database/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async isLiked(postId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(
        and(
          eq(postLikes.postId, postId),
          sql`(post_likes.user_id).user_id = ${userId}`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async toggle(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    try {
      const postRows = await this.db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      if (postRows.length === 0) {
        throw new NotFoundException('帖子不存在');
      }

      const result = await this.db.transaction(async (tx) => {
        const existing = await tx
          .select({ id: postLikes.id })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.postId, postId),
              sql`(post_likes.user_id).user_id = ${userId}`,
            ),
          )
          .limit(1);

        let liked: boolean;
        if (existing.length > 0) {
          const deleted = await tx
            .delete(postLikes)
            .where(eq(postLikes.id, existing[0].id))
            .returning({ id: postLikes.id });
          if (deleted.length > 0) {
            await tx
              .update(posts)
              .set({ likeCount: sql`GREATEST(0, ${posts.likeCount} - 1)` })
              .where(eq(posts.id, postId));
          }
          liked = false;
        } else {
          try {
            await tx.insert(postLikes).values({
              postId,
              userId,
            });
            await tx
              .update(posts)
              .set({ likeCount: sql`${posts.likeCount} + 1` })
              .where(eq(posts.id, postId));
          } catch (insertError) {
            const code = this.extractPgErrorCode(insertError);
            if (code === '23505') {
              liked = true;
              const countRows = await tx
                .select({ likeCount: posts.likeCount })
                .from(posts)
                .where(eq(posts.id, postId))
                .limit(1);
              return {
                liked,
                likeCount: countRows[0]?.likeCount ?? 0,
              };
            }
            throw insertError;
          }
          liked = true;
        }

        const countRows = await tx
          .select({ likeCount: posts.likeCount })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1);

        return {
          liked,
          likeCount: countRows[0]?.likeCount ?? 0,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`点赞操作失败 postId=${postId}`, JSON.stringify(error));
      throw error;
    }
  }

  private extractPgErrorCode(error: unknown): string | undefined {
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
      const { code, cause } = current as { code?: unknown; cause?: unknown };
      if (typeof code === 'string') return code;
      current = cause;
    }
    return undefined;
  }
}
