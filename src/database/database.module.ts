import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/user.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';
import { Mission } from '../analysis/entities/mission.entity';
import { CustomMission } from '../missions/entities/custom-mission.entity';
import { MissionSubmission } from '../missions/entities/mission-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AnalysisRun, Mission, CustomMission, MissionSubmission])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
