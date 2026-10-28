import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { postFavorites, posts } from '@server/database/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async isFavorited(postId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: postFavorites.id })
      .from(postFavorites)
      .where(
        and(
          eq(postFavorites.postId, postId),
          sql`(post_favorites.user_id).user_id = ${userId}`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async toggle(
    postId: string,
    userId: string,
  ): Promise<{ favorited: boolean; favoriteCount: number }> {
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
          .select({ id: postFavorites.id })
          .from(postFavorites)
          .where(
            and(
              eq(postFavorites.postId, postId),
              sql`(post_favorites.user_id).user_id = ${userId}`,
            ),
          )
          .limit(1);

        let favorited: boolean;
        if (existing.length > 0) {
          const deleted = await tx
            .delete(postFavorites)
            .where(eq(postFavorites.id, existing[0].id))
            .returning({ id: postFavorites.id });
          if (deleted.length > 0) {
            await tx
              .update(posts)
              .set({ favoriteCount: sql`GREATEST(0, ${posts.favoriteCount} - 1)` })
              .where(eq(posts.id, postId));
          }
          favorited = false;
        } else {
          try {
            await tx.insert(postFavorites).values({
              postId,
              userId,
            });
            await tx
              .update(posts)
              .set({ favoriteCount: sql`${posts.favoriteCount} + 1` })
              .where(eq(posts.id, postId));
          } catch (insertError) {
            const code = this.extractPgErrorCode(insertError);
            if (code === '23505') {
              favorited = true;
              const countRows = await tx
                .select({ favoriteCount: posts.favoriteCount })
                .from(posts)
                .where(eq(posts.id, postId))
                .limit(1);
              return {
                favorited,
                favoriteCount: countRows[0]?.favoriteCount ?? 0,
              };
            }
            throw insertError;
          }
          favorited = true;
        }

        const countRows = await tx
          .select({ favoriteCount: posts.favoriteCount })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1);

        return {
          favorited,
          favoriteCount: countRows[0]?.favoriteCount ?? 0,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`收藏操作失败 postId=${postId}`, JSON.stringify(error));
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
