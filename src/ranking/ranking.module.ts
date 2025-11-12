import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { User } from '../auth/entities/user.entity';
import { AnalysisRun } from '../analysis/entities/analysis-run.entity';

@Module({
  imports: [DatabaseModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}