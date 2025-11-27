import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('analysis_runs')
export class AnalysisRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
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

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFileName: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  @Index()
  status: AnalysisStatus;

  @Column({ type: 'jsonb', nullable: true })
  findings: any;

  @Column({ type: 'jsonb', nullable: true })
  toolResults: any;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'integer', default: 0 })
  totalIssues: number;

  @Column({ type: 'integer', default: 0 })
  highSeverityIssues: number;

  @Column({ type: 'integer', default: 0 })
  mediumSeverityIssues: number;

  @Column({ type: 'integer', default: 0 })
  lowSeverityIssues: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number;

  @Column({ type: 'jsonb', nullable: true })
  fileStats: {
    totalFiles: number;
    javaFiles: number;
    pythonFiles: number;
    jsFiles: number;
    linesOfCode: number;
  };

  @Column({ type: 'text', nullable: true })
  analysisLog: string;

  @Column({ type: 'integer', default: 0 })
  processingTimeSeconds: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  version: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
