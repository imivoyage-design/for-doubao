import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: ForumRequest, _res: Response, next: NextFunction): Promise<void> {
    const token = req.cookies?.[AuthService.getCookieName()];
    if (token) {
      try {
        const user = await this.authService.getUserByToken(token);
        req.forumUser = user;
      } catch {
        req.forumUser = null;
      }
    } else {
      req.forumUser = null;
    }
    next();
  }
}
