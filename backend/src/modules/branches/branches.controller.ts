import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { UserEntity } from '../users/entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  // BR-002: Only Admin may create Branches
  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: UserEntity) {
    return this.branchesService.create(dto, user);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: UserEntity) {
    return this.branchesService.update(id, dto, user);
  }

  // BR-005: cannot delete with active Departments (enforced in service)
  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.branchesService.remove(id, user);
  }
}
