import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ForumRequest } from '@server/common/interfaces/forum.interface';
import { AuthService } from './auth.service';
import type {
  AuthUser,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
} from '@shared/api.interface';

function getCookiePath(req: ForumRequest): string {
  const url = req.originalUrl || req.url || '';
  const match = url.match(/^\/(app\/[^/]+)\//);
  if (match) return `/${match[1]}`;
  return '/';
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractToken(req: ForumRequest): string | undefined {
    return req.cookies?.[AuthService.getCookieName()];
  }

  @Post('register')
  async register(@Body() dto: RegisterRequest): Promise<AuthUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Req() req: ForumRequest,
    @Body() dto: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.authService.login(dto.username, dto.password);
    const cookiePath = getCookiePath(req);
    res.cookie(AuthService.getCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: cookiePath,
    });
    return user;
  }

  @Post('logout')
  async logout(
    @Req() req: ForumRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const token = this.extractToken(req);
    if (token) {
      await this.authService.logout(token);
    }
    const cookiePath = getCookiePath(req);
    res.clearCookie(AuthService.getCookieName(), { path: cookiePath });
    return { success: true };
  }

  @Get('me')
  async me(@Req() req: ForumRequest): Promise<AuthUser> {
    const token = this.extractToken(req);
    const user = token ? await this.authService.getUserByToken(token) : null;
    if (!user) {
      throw new UnauthorizedException('未登录');
    }
    return user;
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: ForumRequest,
    @Body() dto: UpdateProfileRequest,
  ): Promise<AuthUser> {
    const token = this.extractToken(req);
    const user = token ? await this.authService.getUserByToken(token) : null;
    if (!user) {
      throw new UnauthorizedException('未登录');
    }
    return this.authService.updateProfile(user.userId, dto);
  }
}
