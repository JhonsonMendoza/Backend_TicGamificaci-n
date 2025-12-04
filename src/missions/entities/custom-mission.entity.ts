import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MissionSubmission } from './mission-submission.entity';

export interface MissionTest {
  name: string;
  className: string;
  methodName: string;
  params: any[];
  expectedResult: any;
  tolerance?: number;
  setup?: string; // Código para instanciar la clase antes de llamar al método
}

@Entity('custom_missions')
export class CustomMission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  subject: string; // 'calculus', 'physics', 'differential', 'digital', 'oop'

  @Column()
  difficulty: string; // 'easy', 'medium', 'hard'

  @Column({ name: 'points_min', nullable: true })
  pointsMin: number;

  @Column({ name: 'points_max', nullable: true })
  pointsMax: number;

  @Column({ name: 'base_points', default: 0 })
  basePoints: number; // Puntos por compilar exitosamente

  @Column({ name: 'points_per_test', default: 0 })
  pointsPerTest: number; // Puntos por cada test pasado

  @Column('simple-array', { name: 'required_classes' })
  requiredClasses: string[]; // ["Vector2D", "Main"]

  @Column('simple-array', { name: 'required_methods', nullable: true })
  requiredMethods: string[]; // ["sumar", "magnitud"]

  @Column('json', { nullable: true })
  tests: MissionTest[]; // Tests a ejecutar para validación

  @Column('text', { nullable: true })
  criteria: string; // Criterios de evaluación adicionales (texto)

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  order: number; // Orden de visualización

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MissionSubmission, submission => submission.customMission)
  submissions: MissionSubmission[];
}
