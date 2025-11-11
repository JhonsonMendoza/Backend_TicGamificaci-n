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
  Res
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
      // Manejar el callback de Google
      const result = await this.authService.googleLogin(req.user);
      
      // Redirigir al frontend con el token
      const redirectUrl = `http://localhost:3000/auth/callback?token=${result.token}`;
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
    return this.authService.findById(req.user.id);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  async getUserStats(@Request() req) {
    return this.authService.getUserStats(req.user.id);
  }
}