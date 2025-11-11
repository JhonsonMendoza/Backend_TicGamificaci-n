import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AnalysisRun } from '../../analysis/entities/analysis-run.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  password: string; // Null para usuarios de Google OAuth

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'student_id', nullable: true })
  studentId: string; // ID de estudiante opcional

  @Column({ nullable: true })
  university: string;

  @Column({ nullable: true })
  career: string;

  // Relación con análisis
  @OneToMany(() => AnalysisRun, (analysis) => analysis.user)
  analyses: AnalysisRun[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos calculados para rankings
  getTotalAnalyses(): number {
    return this.analyses?.length || 0;
  }

  getAverageScore(): number {
    if (!this.analyses || this.analyses.length === 0) return 0;
    
    const scores = this.analyses
      .filter(analysis => analysis.qualityScore !== null && analysis.qualityScore !== undefined)
      .map(analysis => typeof analysis.qualityScore === 'string' ? parseFloat(analysis.qualityScore) : analysis.qualityScore);
    
    if (scores.length === 0) return 0;
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getTotalIssuesFound(): number {
    if (!this.analyses || this.analyses.length === 0) return 0;
    
    return this.analyses.reduce((total, analysis) => total + (analysis.totalIssues || 0), 0);
  }
}