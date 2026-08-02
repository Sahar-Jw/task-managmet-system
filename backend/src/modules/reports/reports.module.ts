import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TaskRatingEntity } from '../task-ratings/entities/task-rating.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, UserEntity, TaskRatingEntity])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
