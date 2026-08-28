import { Module } from '@nestjs/common';
import { ReporteService } from './reporte.service';

@Module({
  providers: [ReporteService],
  exports: [ReporteService],
})
export class ReporteModule {}
