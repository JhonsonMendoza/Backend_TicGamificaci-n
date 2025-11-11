import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { User } from '../auth/entities/user.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AnalysisRun]),
  ],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}