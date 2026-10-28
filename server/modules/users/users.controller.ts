import { Controller, Get, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import type { UserProfileInfo, PostListResponse } from '@shared/api.interface';

@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  async getProfile(@Req() req: ForumRequest): Promise<UserProfileInfo> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.usersService.getProfile(user.userId);
  }

  @Get(':userId/posts')
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PostListResponse> {
    return this.usersService.getUserPosts(userId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  @Get('favorites')
  async getFavorites(
    @Req() req: ForumRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PostListResponse> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.usersService.getFavoritePosts(user.userId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }
}
