import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { posts, categories, userMutes, userProfiles } from '@server/database/schema';
import { eq, sql, desc, and, like, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { MutedUser, AdminMuteUserRequest, AdminUser, AdminUserListResponse } from '@shared/api.interface';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async updatePostCategory(postId: string, categoryId: string): Promise<void> {
    try {
      // Verify category exists
      const catRows = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (catRows.length === 0) {
        throw new NotFoundException('分类不存在');
      }

      const updated = await this.db
        .update(posts)
        .set({ categoryId })
        .where(eq(posts.id, postId))
        .returning({ id: posts.id });

      if (updated.length === 0) {
        throw new NotFoundException('帖子不存在');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`更新帖子分类失败 postId=${postId}`, JSON.stringify(error));
      throw error;
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      const deleted = await this.db
        .delete(posts)
        .where(eq(posts.id, postId))
        .returning({ id: posts.id });

      if (deleted.length === 0) {
        throw new NotFoundException('帖子不存在');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`删除帖子失败 postId=${postId}`, JSON.stringify(error));
      throw error;
    }
  }

  async muteUser(dto: AdminMuteUserRequest, mutedByUserId: string): Promise<void> {
    try {
      const targetUserId = await this.resolveUserId(dto.userId);

      const existingRows = await this.db
        .select({ id: userMutes.id, expiresAt: userMutes.expiresAt })
        .from(userMutes)
        .where(sql`(user_mutes.user_id).user_id = ${targetUserId}`)
        .limit(1);

      const now = new Date();
      const isCurrentlyMuted =
        existingRows.length > 0 &&
        (existingRows[0].expiresAt === null || existingRows[0].expiresAt > now);

      if (isCurrentlyMuted) {
        throw new ConflictException('该用户已被禁言');
      }

      if (existingRows.length > 0) {
        const patch: { reason?: string; expiresAt?: Date | null; mutedBy?: string } = {};
        if (dto.reason !== undefined) patch.reason = dto.reason;
        if (dto.expiresAt !== undefined) {
          patch.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        }
        patch.mutedBy = mutedByUserId;

        await this.db
          .update(userMutes)
          .set(patch)
          .where(sql`(user_mutes.user_id).user_id = ${targetUserId}`);
      } else {
        await this.db.insert(userMutes).values({
          userId: targetUserId,
          reason: dto.reason,
          mutedBy: mutedByUserId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        });
      }
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
      this.logger.error(`禁言用户失败 userId=${dto.userId}`, JSON.stringify(error));
      throw error;
    }
  }

  private async resolveUserId(identifier: string): Promise<string> {
    const rows = await this.db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(or(eq(userProfiles.userId, identifier), eq(userProfiles.username, identifier)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('用户不存在，请检查用户ID或用户名');
    }
    return rows[0].userId;
  }

  async unmuteUser(targetUserId: string): Promise<void> {
    try {
      const deleted = await this.db
        .delete(userMutes)
        .where(sql`(user_mutes.user_id).user_id = ${targetUserId}`)
        .returning({ id: userMutes.id });

      if (deleted.length === 0) {
        throw new NotFoundException('用户未被禁言');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`解除禁言失败 userId=${targetUserId}`, JSON.stringify(error));
      throw error;
    }
  }

  async listMutes(): Promise<MutedUser[]> {
    try {
      const mutedUserTable = alias(userProfiles, 'muted_user');
      const mutedByTable = alias(userProfiles, 'muted_by_user');

      const rows = await this.db
        .select({
          id: userMutes.id,
          userId: userMutes.userId,
          reason: userMutes.reason,
          mutedBy: userMutes.mutedBy,
          expiresAt: userMutes.expiresAt,
          createdAt: userMutes.createdAt,
          mutedUsername: mutedUserTable.username,
          mutedUserNickname: mutedUserTable.nickname,
          mutedByUsername: mutedByTable.username,
          mutedByNickname: mutedByTable.nickname,
        })
        .from(userMutes)
        .innerJoin(
          mutedUserTable,
          sql`(user_mutes.user_id).user_id = ${mutedUserTable.userId}`,
        )
        .leftJoin(
          mutedByTable,
          sql`(user_mutes.muted_by).user_id = ${mutedByTable.userId}`,
        )
        .orderBy(desc(userMutes.createdAt));

      type MuteRow = (typeof rows)[number];
      return rows.map((row: MuteRow) => ({
        id: row.id,
        userId: row.userId,
        userName: row.mutedUserNickname || row.mutedUsername || row.userId,
        username: row.mutedUsername ?? '',
        nickname: row.mutedUserNickname ?? '',
        reason: row.reason ?? null,
        mutedBy: row.mutedBy ?? '',
        mutedByName:
          row.mutedByNickname || row.mutedByUsername || row.mutedBy || '',
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error('获取禁言列表失败', JSON.stringify(error));
      throw error;
    }
  }

  async listUsers(options: {
    page: number;
    pageSize: number;
    keyword?: string;
  }): Promise<AdminUserListResponse> {
    const { page, pageSize, keyword } = options;
    const offset = (page - 1) * pageSize;

    try {
      const whereConditions = [];
      if (keyword) {
        const search = `%${keyword}%`;
        whereConditions.push(
          or(
            like(userProfiles.nickname, search),
            like(userProfiles.username, search),
          ),
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [countResult, rows] = await Promise.all([
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(userProfiles)
          .where(whereClause),
        this.db
          .select({
            userId: userProfiles.userId,
            username: userProfiles.username,
            nickname: userProfiles.nickname,
            role: userProfiles.role,
            avatarUrl: userProfiles.avatarUrl,
            createdAt: userProfiles.createdAt,
            muteId: userMutes.id,
            muteReason: userMutes.reason,
            muteExpiresAt: userMutes.expiresAt,
          })
          .from(userProfiles)
          .leftJoin(
            userMutes,
            sql`(user_mutes.user_id).user_id = ${userProfiles.userId}`,
          )
          .where(whereClause)
          .orderBy(desc(userProfiles.createdAt))
          .limit(pageSize)
          .offset(offset),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const items: AdminUser[] = rows.map((row) => {
        const isMuted = !!row.muteId && (
          row.muteExpiresAt === null || row.muteExpiresAt > new Date()
        );
        return {
          userId: row.userId,
          username: row.username ?? '',
          nickname: row.nickname ?? '',
          role: row.role,
          avatarUrl: row.avatarUrl ?? null,
          isMuted,
          muteReason: isMuted ? (row.muteReason ?? null) : null,
          muteExpiresAt: isMuted && row.muteExpiresAt ? row.muteExpiresAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
        };
      });

      return { items, total, page, pageSize };
    } catch (error) {
      this.logger.error('获取用户列表失败', JSON.stringify(error));
      throw error;
    }
  }
}
