import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { appError } from '../errors/app-error';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role || !requiredRoles.includes(user.role.name)) {
      throw new ForbiddenException(appError('YOU_DO_NOT_HAVE_PERMISSION_PERFORM_ACTION', 'You do not have permission to perform this action'));
    }
    return true;
  }
}
