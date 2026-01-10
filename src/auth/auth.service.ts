import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto, UpdateProfileDto, UserResponseDto } from './dto/auth.dto';
import { AchievementsService } from './services/achievements.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private achievementsService: AchievementsService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: UserResponseDto; token: string }> {
    const { email, password, name, studentId, university, career } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      studentId,
      university,
      career,
      emailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Inicializar logros para el nuevo usuario
    await this.achievementsService.initializeAchievementsForUser(savedUser);

    // Generar token JWT
    const token = this.generateJwtToken(savedUser);

    return {
      user: this.toUserResponse(savedUser),
      token,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: UserResponseDto; token: string }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['analyses']
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    const token = this.generateJwtToken(user);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid && user.isActive) {
      return user;
    }
    
    return null;
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    profilePicture?: string;
  }): Promise<{ user: UserResponseDto; token: string }> {
    const { googleId, email, name, profilePicture } = googleUser;

    // Buscar usuario existente por Google ID o email
    let user = await this.userRepository.findOne({
      where: [
        { googleId },
        { email }
      ],
      relations: ['analyses']
    });

    if (user) {
      // Actualizar información de Google si es necesario
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = profilePicture;
        user.emailVerified = true;
        await this.userRepository.save(user);
      }
      
      // Inicializar logros si el usuario no los tiene
      const existingAchievements = await this.achievementsService.getAchievementsByUserId(user.id);
      if (existingAchievements.length === 0) {
        await this.achievementsService.initializeAchievementsForUser(user);
      }
    } else {
      // Crear nuevo usuario con Google
      user = this.userRepository.create({
        googleId,
        email,
        name,
        profilePicture,
        emailVerified: true,
        password: null, // Los usuarios de Google no tienen contraseña local
      });

      user = await this.userRepository.save(user);
      
      // Inicializar logros para el nuevo usuario
      await this.achievementsService.initializeAchievementsForUser(user);
      
      // Recargar el usuario para obtener todas las relaciones
      user = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['analyses']
      });
    }

    const token = this.generateJwtToken(user);

    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { id },
      relations: ['analyses']
    });
  }

  async updateProfile(userId: number, updateDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    Object.assign(user, updateDto);
    const updatedUser = await this.userRepository.save(user);

    return this.toUserResponse(updatedUser);
  }

  async getUserStats(userId: number): Promise<{
    totalAnalyses: number;
    averageScore: number;
    totalIssuesFound: number;
    recentAnalyses: any[];
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['analyses'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const totalAnalyses = user.getTotalAnalyses();
    const averageScore = user.getAverageScore();
    const totalIssuesFound = user.getTotalIssuesFound();

    // Obtener los 5 análisis más recientes
    const recentAnalyses = user.analyses
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5) || [];

    return {
      totalAnalyses,
      averageScore,
      totalIssuesFound,
      recentAnalyses,
    };
  }

  private generateJwtToken(user: User): string {
    const payload = { 
      sub: user.id, 
      email: user.email,
      name: user.name
    };
    
    return this.jwtService.sign(payload, {
      expiresIn: '7d', // Token válido por 7 días
    });
  }

  generateTokenForUser(userId: number, email: string, name: string): string {
    const payload = { 
      sub: userId, 
      email,
      name
    };
    
    return this.jwtService.sign(payload, {
      expiresIn: '7d', // Token válido por 7 días
    });
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
      studentId: user.studentId,
      university: user.university,
      career: user.career,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      totalAnalyses: user.getTotalAnalyses(),
      averageScore: user.getAverageScore(),
      totalIssuesFound: user.getTotalIssuesFound(),
    };
  }

  toUserResponsePublic(user: User): UserResponseDto {
    return this.toUserResponse(user);
  }
}