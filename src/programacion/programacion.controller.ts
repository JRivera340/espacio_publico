import {
  Body, Controller, Delete, Get, Param, ParseArrayPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ProgramacionService } from './programacion.service';
import { CreateProgramacionItemDto } from './dto/create-programacion-item.dto';
import { UpdateProgramacionItemDto } from './dto/update-programacion-item.dto';
import { ListFilters } from './programacion.types';

type AuthedRequest = Request & {
  user: { userId: string; email: string; role: Role };
};

// Los filtros de query llegan siempre como string desde Express: hay que
// castear explicitamente antes de pasarlos al repositorio.
export function parseFilters(query: Record<string, any>): ListFilters {
  const filters: ListFilters = {};
  if (query.desde) filters.desde = query.desde;
  if (query.hasta) filters.hasta = query.hasta;
  if (query.gestor) filters.gestor = query.gestor;
  if (query.estado) filters.estado = query.estado;
  return filters;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('programacion')
export class ProgramacionController {
  constructor(private readonly service: ProgramacionService) {}

  // Acepta un lote: la programacion se carga de un saque, no actividad por
  // actividad.
  @Post()
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  crear(
    @Req() req: AuthedRequest,
    @Body(new ParseArrayPipe({ items: CreateProgramacionItemDto }))
    items: CreateProgramacionItemDto[],
  ) {
    return this.service.crear(req.user.userId, items);
  }

  // El id del gestor sale siempre del token, nunca de un query param: un
  // gestor no puede pedir la programacion de otro. Mismo criterio que
  // GET /actividades/mine.
  @Get('mias')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO)
  listarMias(@Req() req: AuthedRequest, @Query() query: Record<string, any>) {
    return this.service.listarMias(req.user.userId, parseFilters(query));
  }

  @Get()
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  listarTodas(@Query() query: Record<string, any>) {
    return this.service.listarTodas(parseFilters(query));
  }

  @Patch(':id')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  editar(@Param('id') id: string, @Body() dto: UpdateProgramacionItemDto) {
    return this.service.editar(id, dto);
  }

  @Delete(':id')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  borrar(@Param('id') id: string) {
    return this.service.borrar(id);
  }
}
