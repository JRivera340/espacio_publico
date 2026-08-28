import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { ListFilters } from './actividades.types';

type AuthedRequest = Request & {
  user: { userId: string; email: string; role: Role };
};

// Los filtros de query llegan siempre como string desde Express: hay que
// castear explicitamente antes de pasarlos al repositorio.
function parseFilters(query: Record<string, any>): ListFilters {
  const filters: ListFilters = {};
  if (query.desde) filters.desde = query.desde;
  if (query.hasta) filters.hasta = query.hasta;
  if (query.barrio) filters.barrio = query.barrio;
  if (query.gestor) filters.gestor = query.gestor;
  if (query.status) filters.status = query.status;
  if (query.isNightShift !== undefined) filters.isNightShift = query.isNightShift === 'true';
  if (query.limit !== undefined) filters.limit = Number(query.limit);
  if (query.offset !== undefined) filters.offset = Number(query.offset);
  return filters;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actividades')
export class ActividadesController {
  constructor(private readonly service: ActividadesService) {}

  @Post()
  @Roles(Role.GESTOR_ESPACIO_PUBLICO)
  crear(@Req() req: AuthedRequest, @Body() dto: CreateActividadDto) {
    return this.service.crear(req.user.userId, dto);
  }

  @Get('mine')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO)
  listarMias(@Req() req: AuthedRequest, @Query() query: Record<string, any>) {
    return this.service.listarMias(req.user.userId, parseFilters(query));
  }

  @Get('mine/stats')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO)
  misEstadisticas(@Req() req: AuthedRequest, @Query() query: Record<string, any>) {
    return this.service.misEstadisticas(req.user.userId, parseFilters(query));
  }

  @Get('pending')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  listarPendientes(@Query() query: Record<string, any>) {
    return this.service.listarPendientes(parseFilters(query));
  }

  @Get('my-validations')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  listarMisValidaciones(@Req() req: AuthedRequest, @Query() query: Record<string, any>) {
    return this.service.listarMisValidaciones(req.user.userId, parseFilters(query));
  }

  @Get('all-ids')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  listarIds(@Query() query: Record<string, any>) {
    return this.service.listarIds(parseFilters(query));
  }

  @Get('stats/gestores')
  @Roles(Role.ADMIN)
  estadisticasGestores() {
    return this.service.estadisticasGestores();
  }

  @Get('stats/barrios')
  @Roles(Role.ADMIN)
  estadisticasBarrios(@Query() query: Record<string, any>) {
    return this.service.estadisticasBarrios(parseFilters(query));
  }

  @Get()
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  listarTodas(@Query() query: Record<string, any>) {
    return this.service.listarTodas(parseFilters(query));
  }

  @Get(':id')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Patch(':id')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  editar(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateActividadDto) {
    return this.service.editar(id, req.user.userId, req.user.role, dto);
  }

  @Post(':id/send')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.ADMIN)
  enviar(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.enviar(id, req.user.userId, req.user.role);
  }

  @Post(':id/approve')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  aprobar(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { notes?: string; selectedPhotos?: string[] },
  ) {
    return this.service.aprobar(id, req.user.userId, body?.notes, body?.selectedPhotos);
  }

  @Post(':id/reject')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  rechazar(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: { notes?: string }) {
    return this.service.rechazar(id, req.user.userId, body?.notes);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  borrar(@Param('id') id: string) {
    return this.service.borrar(id);
  }

  @Post('bulk-delete')
  @Roles(Role.ADMIN)
  borrarVarias(@Body() body: { ids: string[] }) {
    return this.service.borrarVarias(body?.ids);
  }
}
