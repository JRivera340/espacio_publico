import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ActividadesService } from './actividades.service';
import { ReporteService } from '../reporte/reporte.service';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';
import { ListFilters } from './actividades.types';
import { getEnv } from '../config/env';
import { UUID_REGEX } from '../users-proxy/users-proxy.controller';

type AuthedRequest = Request & {
  user: { userId: string; email: string; role: Role };
};

// Convierte un query param a entero no negativo. Ausente o vacio devuelve
// undefined (se ignora); cualquier otro valor que no sea un entero >= 0 es un
// 400 legible en vez de dejar que Number(...) produzca NaN o un negativo que
// termine en un LIMIT/OFFSET invalido que Postgres rechaza con un 500 opaco.
function parseNonNegativeInt(raw: any, nombreParametro: string): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor < 0) {
    throw new BadRequestException(`El parametro "${nombreParametro}" debe ser un numero entero mayor o igual a 0.`);
  }
  return valor;
}

// Los filtros de query llegan siempre como string desde Express: hay que
// castear explicitamente antes de pasarlos al repositorio.
export function parseFilters(query: Record<string, any>): ListFilters {
  const filters: ListFilters = {};
  if (query.desde) filters.desde = query.desde;
  if (query.hasta) filters.hasta = query.hasta;
  if (query.barrio) filters.barrio = query.barrio;
  if (query.gestor) filters.gestor = query.gestor;
  if (query.status) filters.status = query.status;
  if (query.isNightShift !== undefined) filters.isNightShift = query.isNightShift === 'true';
  const limit = parseNonNegativeInt(query.limit, 'limit');
  if (limit !== undefined) filters.limit = limit;
  const offset = parseNonNegativeInt(query.offset, 'offset');
  if (offset !== undefined) filters.offset = offset;
  return filters;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actividades')
export class ActividadesController {
  constructor(
    private readonly service: ActividadesService,
    private readonly reporteService: ReporteService,
  ) {}

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
  listarIds(@Req() req: AuthedRequest, @Query() query: Record<string, any>) {
    return this.service.listarIds(parseFilters(query), req.user.userId, req.user.role);
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

  @Get('report-xlsx')
  @Roles(Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  async reportXlsx(@Query() query: Record<string, any>, @Res() res: Response) {
    const { data } = await this.service.listarTodas(parseFilters(query));
    // La url del enlace publico sale siempre de la variable de entorno: nunca
    // del query param del cliente, que podria apuntar a un dominio ajeno en
    // un archivo con sello institucional.
    const buffer = this.reporteService.generarXlsx(data, getEnv().FRONTEND_URL);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="espacio-publico.xlsx"');
    res.send(buffer);
  }

  @Get(':id')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  obtener(@Req() req: AuthedRequest, @Param('id') id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Id de actividad invalido');
    }
    return this.service.obtener(id, req.user.userId, req.user.role);
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
