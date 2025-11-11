import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RankingService } from './src/ranking/ranking.service';

async function testRankings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rankingService = app.get(RankingService);

  try {
    console.log('Testing global rankings...');
    const result = await rankingService.getGlobalRankings();
    console.log('Global rankings result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing rankings:', error);
  }

  await app.close();
}

testRankings();