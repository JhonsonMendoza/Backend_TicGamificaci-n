import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameColumnsToSnakeCase0000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Renombrar columnas en analysis_runs
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "projectPath" TO "project_path"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "originalFileName" TO "original_file_name"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "fileSize" TO "file_size"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "toolResults" TO "tool_results"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "errorMessage" TO "error_message"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "totalIssues" TO "total_issues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "highSeverityIssues" TO "high_severity_issues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "mediumSeverityIssues" TO "medium_severity_issues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "lowSeverityIssues" TO "low_severity_issues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "qualityScore" TO "quality_score"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "fileStats" TO "file_stats"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "analysisLog" TO "analysis_log"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "processingTimeSeconds" TO "processing_time_seconds"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "updatedAt" TO "updated_at"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "completedAt" TO "completed_at"`);

    // Renombrar columnas en achievements
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "pointsReward" TO "points_reward"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "isUnlocked" TO "is_unlocked"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "unlockedAt" TO "unlocked_at"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progressCurrent" TO "progress_current"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progressTarget" TO "progress_target"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "updatedAt" TO "updated_at"`);

    // Renombrar columnas en users
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "googleId" TO "google_id"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "profilePicture" TO "profile_picture"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "isActive" TO "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "email_verified"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "studentId" TO "student_id"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`);

    // Renombrar columnas en missions
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "analysisRunId" TO "analysis_run_id"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "filePath" TO "file_path"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "lineStart" TO "line_start"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "lineEnd" TO "line_end"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "fixedAt" TO "fixed_at"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "updatedAt" TO "updated_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios en missions
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "analysis_run_id" TO "analysisRunId"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "file_path" TO "filePath"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "line_start" TO "lineStart"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "line_end" TO "lineEnd"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "fixed_at" TO "fixedAt"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "missions" RENAME COLUMN "updated_at" TO "updatedAt"`);

    // Revertir cambios en users
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "google_id" TO "googleId"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "profile_picture" TO "profilePicture"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "is_active" TO "isActive"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "email_verified" TO "emailVerified"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "student_id" TO "studentId"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`);

    // Revertir cambios en achievements
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "points_reward" TO "pointsReward"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "is_unlocked" TO "isUnlocked"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "unlocked_at" TO "unlockedAt"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progress_current" TO "progressCurrent"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "progress_target" TO "progressTarget"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "achievements" RENAME COLUMN "updated_at" TO "updatedAt"`);

    // Revertir cambios en analysis_runs
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "project_path" TO "projectPath"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "original_file_name" TO "originalFileName"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "file_size" TO "fileSize"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "tool_results" TO "toolResults"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "error_message" TO "errorMessage"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "total_issues" TO "totalIssues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "high_severity_issues" TO "highSeverityIssues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "medium_severity_issues" TO "mediumSeverityIssues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "low_severity_issues" TO "lowSeverityIssues"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "quality_score" TO "qualityScore"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "file_stats" TO "fileStats"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "analysis_log" TO "analysisLog"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "processing_time_seconds" TO "processingTimeSeconds"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "updated_at" TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "analysis_runs" RENAME COLUMN "completed_at" TO "completedAt"`);
  }
}
