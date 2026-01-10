import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameColumnsToSnakeCase0000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migración condicional: solo renombra columnas si existen en camelCase
    // Si las columnas ya están en snake_case (de una migración anterior), no hace nada

    // Verificar y renombrar columnas en analysis_runs
    const analysisRunsTable = await queryRunner.getTable('analysis_runs');
    if (analysisRunsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = analysisRunsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('projectPath', 'project_path');
      await renameColumn('originalFileName', 'original_file_name');
      await renameColumn('fileSize', 'file_size');
      await renameColumn('toolResults', 'tool_results');
      await renameColumn('errorMessage', 'error_message');
      await renameColumn('totalIssues', 'total_issues');
      await renameColumn('highSeverityIssues', 'high_severity_issues');
      await renameColumn('mediumSeverityIssues', 'medium_severity_issues');
      await renameColumn('lowSeverityIssues', 'low_severity_issues');
      await renameColumn('qualityScore', 'quality_score');
      await renameColumn('fileStats', 'file_stats');
      await renameColumn('analysisLog', 'analysis_log');
      await renameColumn('processingTimeSeconds', 'processing_time_seconds');
      await renameColumn('createdAt', 'created_at');
      await renameColumn('updatedAt', 'updated_at');
      await renameColumn('completedAt', 'completed_at');
    }

    // Verificar y renombrar columnas en achievements
    const achievementsTable = await queryRunner.getTable('achievements');
    if (achievementsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = achievementsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('pointsReward', 'points_reward');
      await renameColumn('isUnlocked', 'is_unlocked');
      await renameColumn('unlockedAt', 'unlocked_at');
      await renameColumn('progressCurrent', 'progress_current');
      await renameColumn('progressTarget', 'progress_target');
      await renameColumn('createdAt', 'created_at');
      await renameColumn('updatedAt', 'updated_at');
    }

    // Verificar y renombrar columnas en users
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = usersTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('googleId', 'google_id');
      await renameColumn('profilePicture', 'profile_picture');
      await renameColumn('isActive', 'is_active');
      await renameColumn('emailVerified', 'email_verified');
      await renameColumn('studentId', 'student_id');
      await renameColumn('createdAt', 'created_at');
      await renameColumn('updatedAt', 'updated_at');
    }

    // Verificar y renombrar columnas en missions
    const missionsTable = await queryRunner.getTable('missions');
    if (missionsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = missionsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('analysisRunId', 'analysis_run_id');
      await renameColumn('filePath', 'file_path');
      await renameColumn('lineStart', 'line_start');
      await renameColumn('lineEnd', 'line_end');
      await renameColumn('fixedAt', 'fixed_at');
      await renameColumn('createdAt', 'created_at');
      await renameColumn('updatedAt', 'updated_at');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migración condicional inversa: solo renombra si las columnas existen en snake_case

    // Revertir cambios en missions
    const missionsTable = await queryRunner.getTable('missions');
    if (missionsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = missionsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('analysis_run_id', 'analysisRunId');
      await renameColumn('file_path', 'filePath');
      await renameColumn('line_start', 'lineStart');
      await renameColumn('line_end', 'lineEnd');
      await renameColumn('fixed_at', 'fixedAt');
      await renameColumn('created_at', 'createdAt');
      await renameColumn('updated_at', 'updatedAt');
    }

    // Revertir cambios en users
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = usersTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('google_id', 'googleId');
      await renameColumn('profile_picture', 'profilePicture');
      await renameColumn('is_active', 'isActive');
      await renameColumn('email_verified', 'emailVerified');
      await renameColumn('student_id', 'studentId');
      await renameColumn('created_at', 'createdAt');
      await renameColumn('updated_at', 'updatedAt');
    }

    // Revertir cambios en achievements
    const achievementsTable = await queryRunner.getTable('achievements');
    if (achievementsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = achievementsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('points_reward', 'pointsReward');
      await renameColumn('is_unlocked', 'isUnlocked');
      await renameColumn('unlocked_at', 'unlockedAt');
      await renameColumn('progress_current', 'progressCurrent');
      await renameColumn('progress_target', 'progressTarget');
      await renameColumn('created_at', 'createdAt');
      await renameColumn('updated_at', 'updatedAt');
    }

    // Revertir cambios en analysis_runs
    const analysisRunsTable = await queryRunner.getTable('analysis_runs');
    if (analysisRunsTable) {
      const renameColumn = async (oldName: string, newName: string) => {
        const column = analysisRunsTable.columns.find(c => c.name === oldName);
        if (column) {
          await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "${oldName}" TO "${newName}"`);
        }
      };

      await renameColumn('project_path', 'projectPath');
      await renameColumn('original_file_name', 'originalFileName');
      await renameColumn('file_size', 'fileSize');
      await renameColumn('tool_results', 'toolResults');
      await renameColumn('error_message', 'errorMessage');
      await renameColumn('total_issues', 'totalIssues');
      await renameColumn('high_severity_issues', 'highSeverityIssues');
      await renameColumn('medium_severity_issues', 'mediumSeverityIssues');
      await renameColumn('low_severity_issues', 'lowSeverityIssues');
      await renameColumn('quality_score', 'qualityScore');
      await renameColumn('file_stats', 'fileStats');
      await renameColumn('analysis_log', 'analysisLog');
      await renameColumn('processing_time_seconds', 'processingTimeSeconds');
      await renameColumn('created_at', 'createdAt');
      await renameColumn('updated_at', 'updatedAt');
      await renameColumn('completed_at', 'completedAt');
    }
  }
}
