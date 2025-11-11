import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RankingService } from './ranking.service';

@Controller('rankings')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get('global')
  async getGlobalRankings(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    const result = await this.rankingService.getGlobalRankings(limitNumber);
    return {
      success: true,
      data: result,
      message: 'Rankings obtenidos exitosamente'
    };
  }

  @Get('my-position')
  @UseGuards(AuthGuard('jwt'))
  async getMyPosition(@Request() req) {
    const result = await this.rankingService.getUserRanking(req.user.id);
    return {
      success: true,
      data: result,
      message: 'Posición del usuario obtenida exitosamente'
    };
  }

  @Get('university/:university')
  async getUniversityRankings(@Param('university') university: string) {
    const result = await this.rankingService.getUniversityRankings(decodeURIComponent(university));
    return {
      success: true,
      data: result,
      message: `Rankings de ${university} obtenidos exitosamente`
    };
  }

  @Get('career/:career')
  async getCareerRankings(@Param('career') career: string) {
    const result = await this.rankingService.getCareerRankings(decodeURIComponent(career));
    return {
      success: true,
      data: result,
      message: `Rankings de ${career} obtenidos exitosamente`
    };
  }

  @Get('stats')
  async getGlobalStats() {
    const result = await this.rankingService.getGlobalRankings(1);
    return {
      success: true,
      data: result.globalStats,
      message: 'Estadísticas globales obtenidas exitosamente'
    };
  }
}