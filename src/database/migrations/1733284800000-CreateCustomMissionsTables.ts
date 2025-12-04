import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCustomMissionsTables1733284800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla custom_missions
    await queryRunner.createTable(
      new Table({
        name: 'custom_missions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'difficulty',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'points_min',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'points_max',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'base_points',
            type: 'int',
            default: 0,
          },
          {
            name: 'points_per_test',
            type: 'int',
            default: 0,
          },
          {
            name: 'required_classes',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'required_methods',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tests',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'criteria',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'order',
            type: 'int',
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

    // Crear tabla mission_submissions
    await queryRunner.createTable(
      new Table({
        name: 'mission_submissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'custom_mission_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'extracted_path',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'points_awarded',
            type: 'int',
            default: 0,
          },
          {
            name: 'tests_passed',
            type: 'int',
            default: 0,
          },
          {
            name: 'tests_failed',
            type: 'int',
            default: 0,
          },
          {
            name: 'testResults',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'feedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'submitted_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
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

    // Crear foreign keys
    await queryRunner.createForeignKey(
      'mission_submissions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'mission_submissions',
      new TableForeignKey({
        columnNames: ['custom_mission_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'custom_missions',
        onDelete: 'CASCADE',
      }),
    );

    // Crear índices
    await queryRunner.createIndex(
      'custom_missions',
      new TableIndex({
        name: 'IDX_custom_missions_subject',
        columnNames: ['subject'],
      }),
    );

    await queryRunner.createIndex(
      'custom_missions',
      new TableIndex({
        name: 'IDX_custom_missions_difficulty',
        columnNames: ['difficulty'],
      }),
    );

    await queryRunner.createIndex(
      'custom_missions',
      new TableIndex({
        name: 'IDX_custom_missions_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'mission_submissions',
      new TableIndex({
        name: 'IDX_mission_submissions_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'mission_submissions',
      new TableIndex({
        name: 'IDX_mission_submissions_mission',
        columnNames: ['custom_mission_id'],
      }),
    );

    await queryRunner.createIndex(
      'mission_submissions',
      new TableIndex({
        name: 'IDX_mission_submissions_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices
    await queryRunner.dropIndex('mission_submissions', 'IDX_mission_submissions_status');
    await queryRunner.dropIndex('mission_submissions', 'IDX_mission_submissions_mission');
    await queryRunner.dropIndex('mission_submissions', 'IDX_mission_submissions_user');
    await queryRunner.dropIndex('custom_missions', 'IDX_custom_missions_active');
    await queryRunner.dropIndex('custom_missions', 'IDX_custom_missions_difficulty');
    await queryRunner.dropIndex('custom_missions', 'IDX_custom_missions_subject');

    // Eliminar tablas (las foreign keys se eliminan automáticamente)
    await queryRunner.dropTable('mission_submissions');
    await queryRunner.dropTable('custom_missions');
  }
}
