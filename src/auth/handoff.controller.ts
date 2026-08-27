import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { getEnv } from '../config/env';

// El hub emite el JWT de siempre y lo manda por POST (body, no query param)
// desde un form auto-submit. Este endpoint solo valida firma y expiracion
// contra el mismo JWT_SECRET que comparte con el hub, y reenvia el token al
// frontend por fragmento de URL (#token=), que nunca llega al servidor.
// Ninguno de los dos saltos deja el JWT en logs de acceso ni en Referer.
//
// Solo lo consume una navegacion de pagina completa, nunca un cliente fetch:
// por eso responde siempre con 302, incluso en error. Un 400/401 crudo se
// veria como una pagina en blanco rota en medio de la navegacion. La causa
// real queda en el log del servidor, nunca el token.
@Controller('handoff')
export class HandoffController {
  private readonly logger = new Logger(HandoffController.name);

  constructor(private readonly jwtService: JwtService) {}

  @Post()
  handoff(@Body('token') token: string | undefined, @Res() res: Response) {
    let frontendUrl: string;
    try {
      const env = getEnv();
      frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');

      if (!token) {
        this.logger.warn('Handoff sin token en el body de la peticion');
        return res.redirect(302, `${frontendUrl}/handoff?error=missing_token`);
      }

      try {
        this.jwtService.verify(token, { secret: env.JWT_SECRET });
      } catch (verifyErr) {
        this.logger.warn(`Handoff con token invalido o expirado: ${(verifyErr as Error).message}`);
        return res.redirect(302, `${frontendUrl}/handoff?error=invalid_token`);
      }

      return res.redirect(302, `${frontendUrl}/handoff#token=${encodeURIComponent(token)}`);
    } catch (err) {
      this.logger.error(`Error inesperado en /api/handoff: ${(err as Error).message}`, (err as Error).stack);
      const fallback = (frontendUrl! || 'https://espaciopublico.bogotaneidapp.com').replace(/\/$/, '');
      return res.redirect(302, `${fallback}/handoff?error=server_error`);
    }
  }
}
