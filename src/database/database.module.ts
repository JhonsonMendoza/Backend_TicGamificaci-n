import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/user.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';
import { Mission } from '../analysis/entities/mission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AnalysisRun, Mission])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
