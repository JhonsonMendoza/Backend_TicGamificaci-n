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
  NotFoundException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res) {
    const result = await this.authService.register(registerDto);
    
    // Establecer la cookie con el token
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: false, // En desarrollo, false; en producción, true
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });
    
    // Devolver la respuesta con el token también en JSON (para compatibilidad)
    return res.json(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res() res) {
    const result = await this.authService.login(loginDto);
    
    // Establecer la cookie con el token
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: false, // En desarrollo, false; en producción, true
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });
    
    // Devolver la respuesta con el token también en JSON (para compatibilidad)
    return res.json(result);
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
      // req.user es la entidad User completa retornada por GoogleStrategy
      const user = req.user;
      
      if (!user || !user.id) {
        const errorUrl = `http://localhost:3000/auth/callback?error=authentication_failed`;
        return res.redirect(errorUrl);
      }
      
      // Generar el token usando el usuario de la BD
      const token = this.authService.generateTokenForUser(user.id, user.email, user.name);
      
      // Establecer la cookie con el token
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false, // En desarrollo, false; en producción, true
        sameSite: 'lax', // Permite el redirect desde Google
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
      });
      
      // Redirigir al frontend con el token también en URL (para compatibilidad)
      const redirectUrl = `http://localhost:3000/auth/callback?token=${token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      // En caso de error, redirigir con mensaje de error
      const errorUrl = `http://localhost:3000/auth/callback?error=authentication_failed`;
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