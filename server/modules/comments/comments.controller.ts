import { Controller, Get, Post, Body, Query, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './comments.dto';
import type { Comment as CommentType } from '@shared/api.interface';

@Controller('api/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  async findByPost(@Query('postId') postId: string): Promise<CommentType[]> {
    if (!postId) {
      throw new BadRequestException('postId 不能为空');
    }
    return this.commentsService.findByPostId(postId);
  }

  @Post()
  async create(
    @Req() req: ForumRequest,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentType> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.commentsService.create(dto, user.userId);
  }
}
