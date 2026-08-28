import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BARRIOS } from './barrio.enum';
import { ENTIDADES } from './entidad.enum';

@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogosController {
  @Get('barrios')
  getBarrios() {
    return { barrios: BARRIOS };
  }

  @Get('entidades')
  getEntidades() {
    return { entidades: ENTIDADES };
  }

  @Get('all')
  getAll() {
    return { barrios: BARRIOS, entidades: ENTIDADES };
  }
}
