import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicoService } from './publico.service';
import { ListFilters } from '../actividades/actividades.types';
import { UUID_REGEX } from '../users-proxy/users-proxy.controller';
import { parseNonNegativeInt } from '../actividades/actividades.controller';

// Endpoints sin autenticacion: alimentan el visor publico. Todo lo que salga
// de aca es legible por cualquiera en internet.

// Sin tope, la portada publica trae la tabla completa en cada visita
// anonima. Con pocas actividades no se nota, pero revienta apenas entren los
// historicos del hub. DEFAULT_LIMIT aplica cuando el cliente no manda limit;
// MAX_LIMIT evita que un limit alto pedido a proposito logre lo mismo.
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function parseFilters(query: Record<string, any>): ListFilters {
  const filters: ListFilters = {};
  if (query.desde) filters.desde = query.desde;
  if (query.hasta) filters.hasta = query.hasta;
  if (query.barrio) filters.barrio = query.barrio;
  const limit = parseNonNegativeInt(query.limit, 'limit');
  filters.limit = limit !== undefined ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = parseNonNegativeInt(query.offset, 'offset');
  if (offset !== undefined) filters.offset = offset;
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
