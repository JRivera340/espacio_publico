import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getEnv } from '../config/env';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Cualquiera de estos, dentro de UN segmento de la ruta hacia el hub, es un
// intento de salirse de /api/users/<recurso> hacia otra ruta del hub (barra,
// backslash, "..", o sus variantes porcentaje-codificadas, que Express
// decodifica dentro del segmento antes de que este codigo las vea).
const PATH_TRAVERSAL_PATTERN = /\/|\|\.\.|%2f|%5c/i;

// Este modulo no tiene tabla de usuarios: la identidad viene del hub (JWT
// compartido, ver jwt.strategy.ts). Para listar gestores —necesario para los
// operativos en grupo y para el panel de admin— y para resolver el nombre de
// quien creo o valido una actividad, este controller reenvia la peticion al
// hub server-to-server, sin CORS de por medio, pasando el mismo token del
// usuario que llamo. El hub valida la firma con el mismo JWT_SECRET; no le
// importa que servicio hizo la llamada.
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersProxyController {
  // Recibe la ruta como segmentos ya separados (nunca como un string armado a
  // mano) para poder validar cada segmento por separado. Asi un endpoint con
  // varios segmentos fijos como 'gestores/list' sigue funcionando, pero
  // ningun segmento individual —en especial uno que venga de un parametro de
  // la URL, como el :id— puede colarse con una barra, un backslash o "..' y
  // pivotear hacia otra ruta del hub. Es defensa en profundidad: aunque un
  // endpoint futuro se olvide de validar su propio parametro, este helper lo
  // frena igual.
  private async proxyToHub(segments: string[], authHeader?: string) {
    for (const segment of segments) {
      if (!segment || PATH_TRAVERSAL_PATTERN.test(segment)) {
        throw new BadRequestException('Parametro invalido');
      }
    }

    const env = getEnv();
    try {
      const res = await fetch(`${env.HUB_API_URL}/api/users/${segments.join('/')}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new HttpException(body || 'Error consultando el hub', res.status);
      }
      return body;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('No se pudo contactar al hub de usuarios', 502);
    }
  }

  @Get('gestores/list')
  async getGestores(@Req() req: any) {
    return this.proxyToHub(['gestores', 'list'], req.headers['authorization']);
  }

  // Usado para resolver el nombre de quien creo/aprobo una actividad (paneles
  // de validador y admin) — este backend solo guarda el userId, no el nombre.
  // El id del hub es un UUID: cualquier otra cosa se rechaza antes de tocar
  // fetch, para que nadie use este parametro para pivotear a otra ruta del
  // hub (recorrido de ruta via ../ o su forma %2F).
  @Get(':id')
  async getUserById(@Param('id') id: string, @Req() req: any) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Id de usuario invalido');
    }
    return this.proxyToHub([id], req.headers['authorization']);
  }
}
