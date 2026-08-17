import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { appError } from '../errors/app-error';
import { RoleName } from '../../shared/enums/role.enum';


@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private readonly paramName: string = 'id') {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetId = request.params[this.paramName];

    if (!user) {
      throw new ForbiddenException(appError('AUTHENTICATION_REQUIRED', 'Authentication required'));
    }
    if (user.role?.name === RoleName.ADMIN) {
      return true;
    }
    if (user.id !== targetId) {
      throw new ForbiddenException(appError('YOU_MAY_ONLY_ACCESS_OWN_RECORD', 'You may only access your own record'));
    }
    return true;
  }
}
