import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssignmentApprovalsService } from './assignment-approvals.service';
import { ApproveDto, RejectApprovalDto } from './dto/assignment-approval.dto';
import { UserEntity } from '../users/entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';

@ApiTags('assignment-approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssignmentApprovalsController {
  constructor(private readonly approvalsService: AssignmentApprovalsService) {}

  @Post('assignments/:id/submit-approval')
  submitForApproval(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.approvalsService.submitForApproval(id, user);
  }

  @Patch('approvals/:id/approve')
  @Roles(RoleName.ADMIN)
  approve(@Param('id') id: string, @Body() dto: ApproveDto, @CurrentUser() user: UserEntity) {
    return this.approvalsService.approve(id, dto, user);
  }

  @Patch('approvals/:id/reject')
  @Roles(RoleName.ADMIN)
  reject(@Param('id') id: string, @Body() dto: RejectApprovalDto, @CurrentUser() user: UserEntity) {
    return this.approvalsService.reject(id, dto, user);
  }
}
