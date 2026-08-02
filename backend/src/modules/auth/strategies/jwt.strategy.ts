import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
