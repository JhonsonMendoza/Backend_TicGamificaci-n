import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAchievementColumnsNames0000000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si las columnas existen, si no, crearlas
    const achievementsTable = await queryRunner.getTable('achievements');
    
    if (achievementsTable) {
      // Verificar y crear columna points_reward si no existe
      const hasPointsReward = achievementsTable.columns.some(c => c.name === 'points_reward');
      if (!hasPointsReward) {
        const hasPointsRewardCamelCase = achievementsTable.columns.some(c => c.name === 'pointsReward');
        
        if (hasPointsRewardCamelCase) {
          // Renombrar de camelCase a snake_case
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "pointsReward" TO "points_reward"`);
        } else {
          // Crear la columna si no existe en ningún formato
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "points_reward" integer DEFAULT 0`);
        }
      }

      // Verificar y crear columna is_unlocked si no existe
      const hasIsUnlocked = achievementsTable.columns.some(c => c.name === 'is_unlocked');
      if (!hasIsUnlocked) {
        const hasIsUnlockedCamelCase = achievementsTable.columns.some(c => c.name === 'isUnlocked');
        
        if (hasIsUnlockedCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "isUnlocked" TO "is_unlocked"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "is_unlocked" boolean DEFAULT false`);
        }
      }

      // Verificar y crear columna unlocked_at si no existe
      const hasUnlockedAt = achievementsTable.columns.some(c => c.name === 'unlocked_at');
      if (!hasUnlockedAt) {
        const hasUnlockedAtCamelCase = achievementsTable.columns.some(c => c.name === 'unlockedAt');
        
        if (hasUnlockedAtCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "unlockedAt" TO "unlocked_at"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "unlocked_at" timestamp DEFAULT NULL`);
        }
      }

      // Verificar y crear columna progress_current si no existe
      const hasProgressCurrent = achievementsTable.columns.some(c => c.name === 'progress_current');
      if (!hasProgressCurrent) {
        const hasProgressCurrentCamelCase = achievementsTable.columns.some(c => c.name === 'progressCurrent');
        
        if (hasProgressCurrentCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progressCurrent" TO "progress_current"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "progress_current" integer DEFAULT NULL`);
        }
      }

      // Verificar y crear columna progress_target si no existe
      const hasProgressTarget = achievementsTable.columns.some(c => c.name === 'progress_target');
      if (!hasProgressTarget) {
        const hasProgressTargetCamelCase = achievementsTable.columns.some(c => c.name === 'progressTarget');
        
        if (hasProgressTargetCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progressTarget" TO "progress_target"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "progress_target" integer DEFAULT NULL`);
        }
      }

      // Verificar y crear columna created_at si no existe
      const hasCreatedAt = achievementsTable.columns.some(c => c.name === 'created_at');
      if (!hasCreatedAt) {
        const hasCreatedAtCamelCase = achievementsTable.columns.some(c => c.name === 'createdAt');
        
        if (hasCreatedAtCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "createdAt" TO "created_at"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        }
      }

      // Verificar y crear columna updated_at si no existe
      const hasUpdatedAt = achievementsTable.columns.some(c => c.name === 'updated_at');
      if (!hasUpdatedAt) {
        const hasUpdatedAtCamelCase = achievementsTable.columns.some(c => c.name === 'updatedAt');
        
        if (hasUpdatedAtCamelCase) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "updatedAt" TO "updated_at"`);
        } else {
          await queryRunner.query(`ALTER TABLE "achievements" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No hacer nada en el down para ser seguro
  }
}
