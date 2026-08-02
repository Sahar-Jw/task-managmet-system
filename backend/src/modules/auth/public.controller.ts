import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BranchesService } from '../branches/branches.service';
import { DepartmentsService } from '../departments/departments.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Unauthenticated directory data needed by the public sign-up form
 * (POST /auth/register): a new visitor picks a Branch and a Department
 * (two independent flat lists — Branch and Department have no relation to
 * one another) before they have a token. Only minimal, non-sensitive
 * fields are returned.
 */
@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get('branches')
  async branches() {
    const branches = await this.branchesService.findAll();
    return branches
      .filter((b) => b.isActive)
      .map((b) => ({ id: b.id, name: b.name, code: b.code }));
  }

  @Get('departments')
  async departments() {
    const departments = await this.departmentsService.findAll();
    return departments
      .filter((d) => d.isActive)
      .map((d) => ({ id: d.id, name: d.name, code: d.code }));
  }
}
