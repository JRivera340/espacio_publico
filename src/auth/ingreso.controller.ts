import { BadRequestException, Body, Controller, HttpException, Logger, Post } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { getEnv } from '../config/env';
import { extraerTokenDelHub } from './lib/token-del-hub';

/**
 * Ingreso temporal por URL, para poder probar el modulo antes de conectarlo al
 * hub.
 *
 * NO es un login propio y no debe convertirse en uno: este modulo no tiene
 * tabla de usuarios ni valida contrasenas. Reenvia las credenciales al hub, que
 * sigue siendo el unico proveedor de identidad, y devuelve el MISMO token que
 * el hub emite. Como el JWT_SECRET es compartido, los guardias de este modulo
 * lo aceptan igual que a uno llegado por handoff.
 *
 * Cuando la entrada desde el hub este lista, esto se elimina.
 */
@Controller('auth')
export class IngresoController {
  private readonly logger = new Logger(IngresoController.name);

  @Public()
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('Escribi tu correo y tu contrasena');
    }

    const env = getEnv();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${env.HUB_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: body.email, password: body.password }),
      });
    } catch (err) {
      this.logger.error(`No se pudo contactar al hub para el ingreso: ${(err as Error).message}`);
      throw new HttpException('No se pudo contactar el sistema de usuarios. Intenta de nuevo en unos minutos', 502);
    }

    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      // El mensaje del hub se reenvia tal cual solo si es legible; nunca se
      // filtra si el correo existe o no, para no volver esto un oraculo de
      // usuarios validos.
      const mensaje =
        respuesta.status === 401 || respuesta.status === 400
          ? 'Correo o contrasena incorrectos'
          : 'No se pudo iniciar sesion. Intenta de nuevo en unos minutos';
      throw new HttpException(mensaje, respuesta.status === 401 ? 401 : respuesta.status);
    }

    const token = extraerTokenDelHub(datos);

    if (!token) {
      this.logger.error('El hub respondio sin token en el cuerpo del login');
      throw new HttpException('No se pudo iniciar sesion. Intenta de nuevo en unos minutos', 502);
    }

    return { access_token: token, user: (datos as { user?: unknown } | null)?.user ?? null };
  }
}
