import { Controller, Post, Get, Param, Req, UnauthorizedException } from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { FavoritesService } from './favorites.service';

@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':postId')
  async toggle(
    @Req() req: ForumRequest,
    @Param('postId') postId: string,
  ): Promise<{ favorited: boolean; favoriteCount: number }> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.favoritesService.toggle(postId, user.userId);
  }

  @Get(':postId/status')
  async getStatus(
    @Req() req: ForumRequest,
    @Param('postId') postId: string,
  ): Promise<{ favorited: boolean }> {
    const user = req.forumUser;
    if (!user) return { favorited: false };
    const favorited = await this.favoritesService.isFavorited(postId, user.userId);
    return { favorited };
  }
}
