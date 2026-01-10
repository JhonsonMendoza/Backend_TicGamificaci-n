import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const googleUser = {
      googleId: id,
      email: emails?.[0]?.value || '',
      name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      profilePicture: photos?.[0]?.value,
    };

    try {
      // googleLogin retorna { user: UserResponseDto, token: string }
      // Pero Passport necesita el usuario en el formato que verá req.user
      // Por eso, también necesito devolver el usuario de la BD
      const result = await this.authService.googleLogin(googleUser);
      
      // Necesito obtener el usuario completo de la BD para que req.user sea correcto
      const fullUser = await this.authService.findById(result.user.id);
      
      // Devolver el usuario completo para que esté disponible en req.user
      done(null, fullUser);
    } catch (error) {
      done(error);
    }
  }
}