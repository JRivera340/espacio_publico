import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActividadEntity } from './entities/actividad.entity';
import { ActividadesController } from './actividades.controller';
import { ActividadesService } from './actividades.service';
import { ACTIVIDADES_REPOSITORY } from './actividades.tokens';
import { TypeOrmActividadesRepository } from './actividades.repository.typeorm';
import { AuthModule } from '../auth/auth.module';
import { ReporteModule } from '../reporte/reporte.module';
import { ProgramacionModule } from '../programacion/programacion.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActividadEntity]), AuthModule, ReporteModule, ProgramacionModule],
  controllers: [ActividadesController],
  providers: [
    ActividadesService,
    { provide: ACTIVIDADES_REPOSITORY, useClass: TypeOrmActividadesRepository },
  ],
  exports: [ActividadesService],
})
export class ActividadesModule {}
