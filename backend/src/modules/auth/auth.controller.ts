import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { RegisterUserDto } from '../users/dto/user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE_NAME = 'refreshToken';
// Without maxAge this becomes a session cookie that the browser deletes as
// soon as the tab/browser is closed — that was silently forcing everyone
// back to the login page on every fresh visit, even though the refresh
// token was still valid server-side. Keep this in sync with
// jwt.refreshExpiresIn (see auth.service#issueTokens) — currently 60 days.
// Refresh tokens rotate on every /auth/refresh call and get a fresh 60-day
// expiry each time (see AuthService#issueTokens), so this is effectively a
// sliding session: a user who opens the app at least once every 60 days
// never has to log in again, and only a stretch of true inactivity (or an
// explicit logout) will sign them out.
const REFRESH_COOKIE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
// `secure: true` unconditionally also blocks the cookie from ever being set
// over plain http (e.g. local dev on http://localhost), which produces the
// exact same "logged out on refresh" symptom. Only require it outside dev.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login — NFR-SEC-03: refresh token as HttpOnly Secure cookie
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const { accessToken, refreshToken, user } = await this.authService.login(dto, ip);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken, user };
  }

  // POST /auth/register — public sign-up, auto-logs-in the new User
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken, user };
  }

  // POST /auth/refresh — exchanges refresh cookie for a new token pair
  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw new UnauthorizedException('Missing refresh token');

    const { accessToken, refreshToken, user } = await this.authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken, user };
  }

  // POST /auth/logout
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: UserEntity,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      await this.authService.logout(token, user.id);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}