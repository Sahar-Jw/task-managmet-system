import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

// Native browser EventSource cannot set an Authorization header, so the
// SSE stream endpoint (GET /notifications/stream) has to take the access
// token as a `?token=` query param instead. This extractor falls back to
// that only when there's no Authorization header, so every other route is
// unaffected. Note: putting a bearer token in a URL means it can end up in
// server access logs / browser history — acceptable here since it's the
// same short-lived (15m) access token already exposed to the client, but
// worth swapping for a dedicated short-lived "stream ticket" if this ever
// needs to satisfy a stricter audit requirement.
function fromQueryParam(req: Request): string | null {
  const token = req?.query?.token;
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromQueryParam,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  /**
   * Runs on every authenticated request. Re-fetches the user so that
   * deactivated/deleted users are rejected even if their access token
   * has not yet expired (BR-017).
   */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findByIdWithRelations(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }
    return user;
  }
}