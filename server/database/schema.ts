/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { foreignKey, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: customTimestamptz("expires_at", { precision: 3 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("user_sessions_token_key").on(table.token),
  foreignKey({
    columns: [table.userProfileId],
    foreignColumns: [userProfiles.id],
    name: "user_sessions_user_profile_id_fkey",
  }).onDelete("cascade"),
]);

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  nickname: varchar("nickname", { length: 50 }).notNull().unique(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: varchar("bio", { length: 200 }),
  role: varchar("role", { length: 20 }).notNull().default('user'),
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_user_profiles_user_id_unique").on(table.userId),
  uniqueIndex("user_profiles_username_key").on(table.username),
  uniqueIndex("user_profiles_nickname_key").on(table.nickname),
]);

export const userMutes = pgTable("user_mutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  reason: varchar("reason", { length: 255 }),
  mutedBy: userProfile("muted_by").notNull(),
  expiresAt: customTimestamptz("expires_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_user_mutes_user_id_unique ON user_mutes USING btree (((user_id).user_id)),
  // Complex index: CREATE INDEX idx_user_mutes_user_id ON user_mutes USING btree (((user_id).user_id)),
]);

export const postFavorites = pgTable("post_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  userId: userProfile("user_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_post_favorites_unique ON post_favorites USING btree (post_id, ((user_id).user_id)),
  index("idx_post_favorites_post_id").on(table.postId),
  // Complex index: CREATE INDEX idx_post_favorites_user_id ON post_favorites USING btree (((user_id).user_id)),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [posts.id],
    name: "post_favorites_post_id_fkey",
  }).onDelete("cascade"),
]);

export const postLikes = pgTable("post_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  userId: userProfile("user_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_post_likes_unique ON post_likes USING btree (post_id, ((user_id).user_id)),
  index("idx_post_likes_post_id").on(table.postId),
  // Complex index: CREATE INDEX idx_post_likes_user_id ON post_likes USING btree (((user_id).user_id)),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [posts.id],
    name: "post_likes_post_id_fkey",
  }).onDelete("cascade"),
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  content: text("content").notNull(),
  author: userProfile("author").notNull(),
  parentId: uuid("parent_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_comments_post_id").on(table.postId),
  // Complex index: CREATE INDEX idx_comments_author ON comments USING btree (((author).user_id)),
  index("idx_comments_parent_id").on(table.parentId),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [posts.id],
    name: "comments_post_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [comments.id],
    name: "comments_parent_id_fkey",
  }).onDelete("cascade"),
]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  categoryId: uuid("category_id").notNull(),
  author: userProfile("author").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('published'),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  favoriteCount: integer("favorite_count").notNull().default(0),
  images: text("images").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_posts_category_id").on(table.categoryId),
  // Complex index: CREATE INDEX idx_posts_author ON posts USING btree (((author).user_id)),
  index("idx_posts_created_at").on(table.createdAt),
  index("idx_posts_status").on(table.status),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [categories.id],
    name: "posts_category_id_fkey",
  }).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  sortOrder: integer("sort_order").default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("categories_name_key").on(table.name),
]);

// ====== 后期扩展表（举报 / 私信）======

// 举报：针对帖子或评论
export const postReports = pgTable("post_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: varchar("target_type", { length: 20 }).notNull(), // post / comment
  targetId: uuid("target_id").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(), // spam/abuse/ad/other
  description: varchar("description", { length: 500 }),
  reporterId: userProfile("reporter_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending/handled/ignored
  handledBy: userProfile("handled_by"),
  handledAt: customTimestamptz("handled_at", { precision: 3 }),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_post_reports_status").on(table.status),
]);

// 私信会话
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userAId: userProfile("user_a_id").notNull(),
  userBId: userProfile("user_b_id").notNull(),
  lastMessageAt: customTimestamptz("last_message_at", { precision: 3 }),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_conversations_user_a").on(table.userAId),
  index("idx_conversations_user_b").on(table.userBId),
]);

// 私信消息
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: userProfile("sender_id").notNull(),
  content: text("content").notNull(),
  read: integer("read").notNull().default(0),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_messages_conversation").on(table.conversationId),
]);

// table aliases
export const categoriesTable = categories;
export const commentsTable = comments;
export const postFavoritesTable = postFavorites;
export const postLikesTable = postLikes;
export const postsTable = posts;
export const userMutesTable = userMutes;
export const userProfilesTable = userProfiles;
export const userSessionsTable = userSessions;
