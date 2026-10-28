import type { Request } from 'express';

export interface ForumUser {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

export type ForumRequest = Request & { forumUser?: ForumUser | null };
