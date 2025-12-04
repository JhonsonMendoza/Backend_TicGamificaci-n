import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { CustomMission } from './custom-mission.entity';

@Entity('mission_submissions')
export class MissionSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => CustomMission, mission => mission.submissions)
  @JoinColumn({ name: 'custom_mission_id' })
  customMission: CustomMission;

  @Column({ name: 'custom_mission_id' })
  customMissionId: number;

  @Column({ name: 'extracted_path', nullable: true })
  extractedPath: string; // Ruta donde se extrajeron los archivos

  @Column({ default: 'pending' })
  status: string; // 'pending', 'approved', 'rejected', 'reviewing', 'error'

  @Column({ name: 'points_awarded', nullable: true })
  pointsAwarded: number;

  @Column({ name: 'tests_passed', nullable: true })
  testsPassed: number;

  @Column({ name: 'tests_failed', nullable: true })
  testsFailed: number;

  @Column('json', { nullable: true })
  testResults: any; // Detalles de qué tests pasaron/fallaron

  @Column('text', { nullable: true })
  feedback: string; // Feedback automático o manual

  @Column('text', { nullable: true })
  errorMessage: string; // Mensaje de error si no compiló

  @Column({ type: 'timestamp', name: 'submitted_at', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
