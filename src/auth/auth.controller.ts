import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Request, 
  Patch,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  Inject
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res) {
    try {
      const result = await this.authService.register(registerDto);
      
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      
      // Establecer la cookie con el token
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: isProduction, // true en producción, false en desarrollo
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
      });
      
      // Devolver la respuesta con el token también en JSON (para compatibilidad)
      return res.json(result);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        statusCode,
        message: error.message || 'Error en el registro',
        error: error.error || 'Bad Request'
      });
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res() res) {
    try {
      const result = await this.authService.login(loginDto);
      
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      const frontendUrl = this.configService.get('FRONTEND_URL');
      
      // Establecer la cookie con el token
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: isProduction, // true en producción, false en desarrollo
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
        domain: isProduction ? undefined : undefined, // Solo en producción si es necesario
      });
      
      // Devolver la respuesta con el token también en JSON (para compatibilidad)
      return res.json(result);
    } catch (error) {
      return res.status(401).json({
        statusCode: 401,
        message: error.message || 'Credenciales inválidas',
        error: 'Unauthorized'
      });
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirige a Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res) {
    try {
      const user = req.user;
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      
      if (!user || !user.id) {
        const errorUrl = `${frontendUrl}/auth/callback?error=authentication_failed`;
        return res.redirect(errorUrl);
      }
      
      // Generar el token usando el usuario de la BD
      const token = this.authService.generateTokenForUser(user.id, user.email, user.name);
      
      // Establecer la cookie con el token
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
      });
      
      // Redirigir al frontend con el token también en URL (para compatibilidad)
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const errorUrl = `${frontendUrl}/auth/callback?error=authentication_failed`;
      return res.redirect(errorUrl);
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    const stats = await this.authService.getUserStats(req.user.id);
    return {
      ...req.user,
      ...stats
    };
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Request() req) {
    const user = await this.authService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getUserStats(@Request() req) {
    return this.authService.getUserStats(req.user.id);
  }
}