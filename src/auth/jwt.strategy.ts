import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getEnv } from '../config/env';
import { Role } from '../common/enums/role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

// El hub firma el token; aca solo se verifica la firma contra el mismo
// JWT_SECRET. No se consulta ninguna tabla: este modulo no tiene usuarios.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const env = getEnv();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
