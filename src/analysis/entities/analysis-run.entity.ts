import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('analysis_runs')
export class AnalysisRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, name: 'project_path', nullable: true })
  projectPath: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  student: string;

  // Nueva relación con Usuario
  @ManyToOne(() => User, (user) => user.analyses, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'original_file_name' })
  originalFileName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'repository_url' })
  repositoryUrl: string;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  @Index()
  status: AnalysisStatus;

  @Column({ type: 'jsonb', nullable: true })
  findings: any;

  @Column({ type: 'jsonb', nullable: true, name: 'tool_results' })
  toolResults: any;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'integer', default: 0, name: 'total_issues' })
  totalIssues: number;

  @Column({ type: 'integer', default: 0, name: 'high_severity_issues' })
  highSeverityIssues: number;

  @Column({ type: 'integer', default: 0, name: 'medium_severity_issues' })
  mediumSeverityIssues: number;

  @Column({ type: 'integer', default: 0, name: 'low_severity_issues' })
  lowSeverityIssues: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'quality_score' })
  qualityScore: number;

  @Column({ type: 'jsonb', nullable: true, name: 'file_stats' })
  fileStats: {
    totalFiles: number;
    javaFiles: number;
    pythonFiles: number;
    jsFiles: number;
    linesOfCode: number;
  };

  @Column({ type: 'text', nullable: true, name: 'analysis_log' })
  analysisLog: string;

  @Column({ type: 'integer', default: 0, name: 'processing_time_seconds' })
  processingTimeSeconds: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  version: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;
}
