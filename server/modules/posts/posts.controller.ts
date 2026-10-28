import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { PostsService } from './posts.service';
import { CreatePostDto } from './posts.dto';
import type {
  Post as PostType,
  PostListResponse,
  PostListRequest,
} from '@shared/api.interface';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new NotFoundException('帖子不存在或已删除');
  }
}

@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findList(
    @Query('categoryId') categoryId?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: 'latest' | 'hot',
  ): Promise<PostListResponse> {
    const query: PostListRequest = {
      categoryId,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      sortBy: sortBy ?? 'latest',
    };
    return this.postsService.findList(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PostType> {
    validateUuid(id);
    return this.postsService.findById(id);
  }

  @Post()
  async create(
    @Req() req: ForumRequest,
    @Body() dto: CreatePostDto,
  ): Promise<PostType> {
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.postsService.create(dto, user.userId);
  }

  @Delete(':id')
  async remove(@Req() req: ForumRequest, @Param('id') id: string): Promise<void> {
    validateUuid(id);
    const user = req.forumUser;
    if (!user) throw new UnauthorizedException('请先登录');
    const isAdmin = user.role === 'admin';
    const isAuthor = await this.postsService.isAuthor(id, user.userId);
    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('无权限删除该帖子');
    }
    await this.postsService.remove(id);
  }
}
