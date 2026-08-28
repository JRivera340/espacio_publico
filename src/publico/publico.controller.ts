import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicoService } from './publico.service';
import { ListFilters } from '../actividades/actividades.types';
import { UUID_REGEX } from '../users-proxy/users-proxy.controller';

// Endpoints sin autenticacion: alimentan el visor publico. Todo lo que salga
// de aca es legible por cualquiera en internet.
function parseFilters(query: Record<string, any>): ListFilters {
  const filters: ListFilters = {};
  if (query.desde) filters.desde = query.desde;
  if (query.hasta) filters.hasta = query.hasta;
  if (query.barrio) filters.barrio = query.barrio;
  return filters;
}

@Controller('publico')
export class PublicoController {
  constructor(private readonly publico: PublicoService) {}

  @Public()
  @Get('actividades')
  listar(@Query() query: Record<string, any>) {
    return this.publico.listar(parseFilters(query));
  }

  @Public()
  @Get('actividades/:id')
  async obtener(@Param('id') id: string) {
    // Un id que ni siquiera es un uuid nunca puede existir en la tabla: un
    // 400 aca no distingue nada que un 404 ya no distinguiera (ambos dicen
    // "esto no es una actividad publicada valida").
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Id de actividad invalido');
    }
    const actividad = await this.publico.obtener(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    return actividad;
  }

  @Public()
  @Get('cifras')
  cifras(@Query() query: Record<string, any>) {
    return this.publico.cifras(parseFilters(query));
  }
}
