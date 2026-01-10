import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type AchievementType =
  | 'first_analysis'
  | 'bug_hunter'
  | 'security_expert'
  | 'perfectionist'
  | 'persistent'
  | 'code_master'
  | 'vulnerability_slayer'
  | 'quality_guardian'
  | 'speed_analyzer'
  | 'general_mission_master'
  | 'critical_fixer'
  | 'consistency_champion'
  | 'learning_champion'
  | 'elite_analyst'
  | 'legendary_developer'
  | 'optimization_master'
  | 'efficient_developer';

@Entity('achievements')
@Index(['userId', 'type'])
@Index(['unlockedAt'])
@Index(['isUnlocked'])
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  type: AchievementType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'badge' })
  icon: string; // 'badge', 'star', 'trophy', 'flame', etc.

  @Column({ type: 'integer', name: 'points_reward' })
  pointsReward: number; // Puntos que otorga al desbloquear

  @Column({ type: 'text' })
  condition: string; // Descripción de la condición para desbloquear

  @Column({ type: 'boolean', default: false, name: 'is_unlocked' })
  isUnlocked: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'unlocked_at' })
  unlockedAt: Date;

  @Column({ type: 'integer', nullable: true, name: 'progress_current' })
  progressCurrent: number; // Progreso actual (ej: 45/50 hallazgos)

  @Column({ type: 'integer', nullable: true, name: 'progress_target' })
  progressTarget: number; // Meta (ej: 50 hallazgos)

  @Column({ type: 'varchar', length: 20, default: 'general' })
  category: 'general' | 'vulnerability' | 'performance' | 'consistency'; // Categoría del logro

  // Relación con Usuario
  @ManyToOne(() => User, (user) => user.achievements, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
