import {
  Controller,
  Patch,
  Delete,
  Post,
  Get,
  Body,
  Param,
  Req,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { AdminService } from './admin.service';
import { AdminMuteUserDto, AdminUpdatePostCategoryDto } from './admin.dto';
import type { MutedUser, AdminUserListResponse } from '@shared/api.interface';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(req: ForumRequest): void {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    if (user.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  private validateUuid(id: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundException('帖子不存在或已删除');
    }
  }

  @Patch('posts/:id/category')
  async updatePostCategory(
    @Req() req: ForumRequest,
    @Param('id') id: string,
    @Body() dto: AdminUpdatePostCategoryDto,
  ): Promise<void> {
    this.checkAdmin(req);
    this.validateUuid(id);
    if (!dto.categoryId) {
      throw new BadRequestException('categoryId 不能为空');
    }
    await this.adminService.updatePostCategory(id, dto.categoryId);
  }

  @Delete('posts/:id')
  async deletePost(@Req() req: ForumRequest, @Param('id') id: string): Promise<void> {
    this.checkAdmin(req);
    this.validateUuid(id);
    await this.adminService.deletePost(id);
  }

  @Post('mutes')
  async muteUser(
    @Req() req: ForumRequest,
    @Body() dto: AdminMuteUserDto,
  ): Promise<void> {
    this.checkAdmin(req);
    const user = req.forumUser!;
    if (!dto.userId) {
      throw new BadRequestException('userId 不能为空');
    }
    await this.adminService.muteUser(dto, user.userId);
  }

  @Delete('mutes/:userId')
  async unmuteUser(
    @Req() req: ForumRequest,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    this.checkAdmin(req);
    await this.adminService.unmuteUser(targetUserId);
  }

  @Get('mutes')
  async listMutes(@Req() req: ForumRequest): Promise<MutedUser[]> {
    this.checkAdmin(req);
    return this.adminService.listMutes();
  }

  @Get('users')
  async listUsers(
    @Req() req: ForumRequest,
  ): Promise<AdminUserListResponse> {
    this.checkAdmin(req);
    const query = req.query;
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const keyword = typeof query.keyword === 'string' ? query.keyword : undefined;
    return this.adminService.listUsers({ page, pageSize, keyword });
  }
}
