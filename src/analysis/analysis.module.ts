import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRun } from './entities/analysis-run.entity';
import { FileService } from './services/file.service';
import { ToolService } from './services/tool.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisRun])],
  controllers: [AnalysisController],
  providers: [AnalysisService, FileService, ToolService],
  exports: [AnalysisService],
})
export class AnalysisModule {}