import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RoleName } from '../../shared/enums/role.enum';


@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private readonly paramName: string = 'id') {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetId = request.params[this.paramName];

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (user.role?.name === RoleName.ADMIN) {
      return true;
    }
    if (user.id !== targetId) {
      throw new ForbiddenException('You may only access your own record');
    }
    return true;
  }
}
