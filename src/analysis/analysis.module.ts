import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRun } from './entities/analysis-run.entity';
import { FileService } from './services/file.service';
import { ToolService } from './services/tool.service';
import { Mission } from './entities/mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisRun, Mission])],
  controllers: [AnalysisController, MissionsController],
  providers: [AnalysisService, FileService, ToolService, MissionsService],
  exports: [AnalysisService, MissionsService],
})
export class AnalysisModule {}