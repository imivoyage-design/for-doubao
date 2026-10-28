import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql, and, isNull, gt, or, ne } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { userProfiles, userSessions, userMutes } from '@server/database/schema';
import type { AuthUser, RegisterRequest, UpdateProfileRequest } from '@shared/api.interface';

const SESSION_DAYS = 7;
const SESSION_COOKIE = 'forum_session';

function generateToken(): string {
  const bytes = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes.toString('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  static getCookieName(): string {
    return SESSION_COOKIE;
  }

  private toAuthUser(
    row: typeof userProfiles.$inferSelect,
    muteInfo?: { isMuted: boolean; muteReason: string | null },
  ): AuthUser {
    return {
      id: row.id,
      userId: row.userId,
      username: row.username ?? '',
      nickname: row.nickname,
      avatarUrl: row.avatarUrl ?? null,
      bio: row.bio ?? null,
      role: row.role,
      isMuted: muteInfo?.isMuted ?? false,
      muteReason: muteInfo?.muteReason ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async getMuteInfo(userId: string): Promise<{ isMuted: boolean; muteReason: string | null }> {
    const rows = await this.db
      .select({ reason: userMutes.reason })
      .from(userMutes)
      .where(
        and(
          sql`(user_mutes.user_id).user_id = ${userId}`,
          or(isNull(userMutes.expiresAt), gt(userMutes.expiresAt, new Date())),
        ),
      )
      .limit(1);
    return rows.length > 0
      ? { isMuted: true, muteReason: rows[0].reason ?? null }
      : { isMuted: false, muteReason: null };
  }

  async register(dto: RegisterRequest): Promise<AuthUser> {
    const username = dto.username.trim();
    const nickname = dto.nickname.trim();

    if (!username || username.length < 3 || username.length > 20) {
      throw new BadRequestException('用户名长度应在 3-20 个字符之间');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('密码长度至少 6 位');
    }
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      throw new BadRequestException('昵称长度应在 2-20 个字符之间');
    }

    const existingUsername = await this.db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new ConflictException('用户名已被注册');
    }

    const existingNickname = await this.db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.nickname, nickname))
      .limit(1);

    if (existingNickname.length > 0) {
      throw new ConflictException('该昵称已被使用');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const inserted = await this.db
      .insert(userProfiles)
      .values({
        userId,
        username,
        passwordHash,
        nickname,
        role: 'user',
      })
      .returning();

    this.logger.log(`用户注册成功 username=${username}`);
    return this.toAuthUser(inserted[0], { isMuted: false, muteReason: null });
  }

  async login(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const rows = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.username, username.trim()))
      .limit(1);

    if (rows.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const userRow = rows[0];
    if (!userRow.passwordHash) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, userRow.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await this.db.insert(userSessions).values({
      userProfileId: userRow.id,
      token,
      expiresAt,
    });

    const muteInfo = await this.getMuteInfo(userRow.userId);
    this.logger.log(`用户登录成功 username=${username}`);
    return { user: this.toAuthUser(userRow, muteInfo), token };
  }

  async getUserByToken(token: string): Promise<AuthUser | null> {
    if (!token) return null;

    const rows = await this.db
      .select({ user: userProfiles, session: userSessions })
      .from(userSessions)
      .innerJoin(userProfiles, eq(userSessions.userProfileId, userProfiles.id))
      .where(eq(userSessions.token, token))
      .limit(1);

    if (rows.length === 0) return null;

    const session = rows[0].session;
    if (session.expiresAt < new Date()) {
      await this.db.delete(userSessions).where(eq(userSessions.id, session.id));
      return null;
    }

    const muteInfo = await this.getMuteInfo(rows[0].user.userId);
    return this.toAuthUser(rows[0].user, muteInfo);
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    await this.db.delete(userSessions).where(eq(userSessions.token, token));
  }

  async updateProfile(userId: string, dto: UpdateProfileRequest): Promise<AuthUser> {
    const patch: Partial<typeof userProfiles.$inferInsert> = {};

    if (dto.nickname !== undefined) {
      const nickname = dto.nickname.trim();
      if (nickname.length < 2 || nickname.length > 20) {
        throw new BadRequestException('昵称长度应在 2-20 个字符之间');
      }
      const nicknameConflict = await this.db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(and(eq(userProfiles.nickname, nickname), ne(userProfiles.userId, userId)))
        .limit(1);
      if (nicknameConflict.length > 0) {
        throw new ConflictException('该昵称已被使用');
      }
      patch.nickname = nickname;
    }
    if (dto.avatarUrl !== undefined) {
      patch.avatarUrl = dto.avatarUrl || null;
    }
    if (dto.bio !== undefined) {
      patch.bio = dto.bio.slice(0, 200) || null;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(userProfiles)
      .set(patch)
      .where(eq(userProfiles.userId, userId))
      .returning();

    if (updated.length === 0) {
      throw new BadRequestException('用户不存在');
    }

    const muteInfo = await this.getMuteInfo(userId);
    return this.toAuthUser(updated[0], muteInfo);
  }

  async getProfileByUserId(userId: string): Promise<AuthUser | null> {
    const rows = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return rows.length > 0 ? this.toAuthUser(rows[0]) : null;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getProfileByUserId(userId);
    return user?.role === 'admin';
  }
}
