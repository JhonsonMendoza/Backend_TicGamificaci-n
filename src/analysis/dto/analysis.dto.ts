import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UploadProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del estudiante es requerido' })
  @MaxLength(255, { message: 'El nombre del estudiante no puede exceder 255 caracteres' })
  student: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}

export class GetAnalysisDto {
  @IsOptional()
  @IsString()
  student?: string;

  @IsOptional()
  @IsString()
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}