import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from './entities/branch.entity';
import { DepartmentEntity } from '../departments/entities/department.entity';
import { UserEntity } from '../users/entities/user.entity';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchEntity, DepartmentEntity, UserEntity]),
    AuditLogsModule,
  ],
  providers: [BranchesService],
  controllers: [BranchesController],
  exports: [BranchesService],
})
export class BranchesModule {}
