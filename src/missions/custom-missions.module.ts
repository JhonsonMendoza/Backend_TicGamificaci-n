import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomMission } from './entities/custom-mission.entity';
import { MissionSubmission } from './entities/mission-submission.entity';
import { CustomMissionsService } from './custom-missions.service';
import { SubmissionsService } from './submissions.service';
import { MissionValidatorService } from './mission-validator.service';
import { CustomMissionsController } from './custom-missions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomMission, MissionSubmission]),
  ],
  controllers: [CustomMissionsController],
  providers: [
    CustomMissionsService,
    SubmissionsService,
    MissionValidatorService,
  ],
  exports: [CustomMissionsService, SubmissionsService],
})
export class CustomMissionsModule {}
