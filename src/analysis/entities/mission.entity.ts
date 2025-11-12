import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AnalysisRun } from './analysis-run.entity';

export type MissionSeverity = 'low' | 'medium' | 'high';
export type MissionStatus = 'pending' | 'fixed' | 'skipped';

@Entity('missions')
@Index(['status'])
@Index(['severity'])
export class Mission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AnalysisRun, (analysis) => analysis.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analysis_run_id' })
  analysisRun: AnalysisRun;

  @Column({ name: 'analysis_run_id' })
  analysisRunId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'file_path', type: 'varchar', length: 1000, nullable: true })
  filePath: string;

  @Column({ name: 'line_start', type: 'integer', nullable: true })
  lineStart: number;

  @Column({ name: 'line_end', type: 'integer', nullable: true })
  lineEnd: number;

  @Column({ type: 'varchar', length: 10 })
  severity: MissionSeverity;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: MissionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'fixed_at', type: 'timestamp', nullable: true })
  fixedAt: Date;
}
