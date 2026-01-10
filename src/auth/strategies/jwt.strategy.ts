import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primero intenta extraer del header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Luego intenta extraer de las cookies
        (request: Request) => {
          if (request.cookies && request.cookies['auth_token']) {
            return request.cookies['auth_token'];
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    // Retornar el usuario para que esté disponible en req.user
    // Esto será solo la entidad para operaciones internas,
    // pero los controladores deben convertirlo al DTO si es necesario
    console.log('[JwtStrategy.validate] Returning user:', user.id);
    return user;
  }
}