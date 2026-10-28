import { Controller, Post, Get, Param, Req, UnauthorizedException } from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { LikesService } from './likes.service';

@Controller('api/likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId')
  async toggle(
    @Req() req: ForumRequest,
    @Param('postId') postId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.likesService.toggle(postId, user.userId);
  }

  @Get(':postId/status')
  async getStatus(
    @Req() req: ForumRequest,
    @Param('postId') postId: string,
  ): Promise<{ liked: boolean }> {
    const user = req.forumUser;
    if (!user) return { liked: false };
    const liked = await this.likesService.isLiked(postId, user.userId);
    return { liked };
  }
}
