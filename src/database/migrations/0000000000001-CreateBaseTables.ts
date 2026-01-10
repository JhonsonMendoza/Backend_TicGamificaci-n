import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateBaseTables1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla users (sin dependencias)
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'password',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'google_id',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'profile_picture',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'student_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'university',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'career',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Crear tabla analysis_runs (depende de users)
    await queryRunner.createTable(
      new Table({
        name: 'analysis_runs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'projectPath',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'student',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'originalFileName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fileSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'findings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'toolResults',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'totalIssues',
            type: 'integer',
            default: 0,
          },
          {
            name: 'highSeverityIssues',
            type: 'integer',
            default: 0,
          },
          {
            name: 'mediumSeverityIssues',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lowSeverityIssues',
            type: 'integer',
            default: 0,
          },
          {
            name: 'qualityScore',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'fileStats',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'analysisLog',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processingTimeSeconds',
            type: 'integer',
            default: 0,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Agregar índices a analysis_runs
    await queryRunner.createIndex(
      'analysis_runs',
      new TableIndex({
        name: 'IDX_analysis_runs_student',
        columnNames: ['student'],
      }),
    );

    await queryRunner.createIndex(
      'analysis_runs',
      new TableIndex({
        name: 'IDX_analysis_runs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'analysis_runs',
      new TableIndex({
        name: 'IDX_analysis_runs_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'analysis_runs',
      new TableIndex({
        name: 'IDX_analysis_runs_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Agregar foreign key a analysis_runs
    await queryRunner.createForeignKey(
      'analysis_runs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // 3. Crear tabla missions (depende de analysis_runs)
    await queryRunner.createTable(
      new Table({
        name: 'missions',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'analysis_run_id',
            type: 'integer',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'line_start',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'line_end',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'fixed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Agregar índices a missions
    await queryRunner.createIndex(
      'missions',
      new TableIndex({
        name: 'IDX_missions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'missions',
      new TableIndex({
        name: 'IDX_missions_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'missions',
      new TableIndex({
        name: 'IDX_missions_analysis_run_id',
        columnNames: ['analysis_run_id'],
      }),
    );

    // Agregar foreign key a missions
    await queryRunner.createForeignKey(
      'missions',
      new TableForeignKey({
        columnNames: ['analysis_run_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'analysis_runs',
        onDelete: 'CASCADE',
      }),
    );

    // 4. Crear tabla achievements (depende de users)
    await queryRunner.createTable(
      new Table({
        name: 'achievements',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            default: "'badge'",
          },
          {
            name: 'pointsReward',
            type: 'integer',
          },
          {
            name: 'condition',
            type: 'text',
          },
          {
            name: 'isUnlocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'unlockedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'progressCurrent',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'progressTarget',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '20',
            default: "'general'",
          },
          {
            name: 'user_id',
            type: 'integer',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Agregar índices a achievements
    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'IDX_achievements_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'IDX_achievements_user_id_type',
        columnNames: ['user_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'IDX_achievements_unlocked_at',
        columnNames: ['unlocked_at'],
      }),
    );

    await queryRunner.createIndex(
      'achievements',
      new TableIndex({
        name: 'IDX_achievements_is_unlocked',
        columnNames: ['is_unlocked'],
      }),
    );

    // Agregar foreign key a achievements
    await queryRunner.createForeignKey(
      'achievements',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    const achievements = await queryRunner.getTable('achievements');
    const achievementsForeignKey = achievements.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (achievementsForeignKey) {
      await queryRunner.dropForeignKey('achievements', achievementsForeignKey);
    }

    const missions = await queryRunner.getTable('missions');
    const missionsForeignKey = missions.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('analysis_run_id') !== -1,
    );
    if (missionsForeignKey) {
      await queryRunner.dropForeignKey('missions', missionsForeignKey);
    }

    const analysisRuns = await queryRunner.getTable('analysis_runs');
    const analysisRunsForeignKey = analysisRuns.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (analysisRunsForeignKey) {
      await queryRunner.dropForeignKey('analysis_runs', analysisRunsForeignKey);
    }

    // Eliminar tablas en orden inverso
    await queryRunner.dropTable('achievements');
    await queryRunner.dropTable('missions');
    await queryRunner.dropTable('analysis_runs');
    await queryRunner.dropTable('users');
  }
}
