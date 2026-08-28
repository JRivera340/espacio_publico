import { Module } from '@nestjs/common';
import { ActividadesModule } from '../actividades/actividades.module';
import { PublicoController } from './publico.controller';
import { PublicoService } from './publico.service';

@Module({
  imports: [ActividadesModule],
  controllers: [PublicoController],
  providers: [PublicoService],
})
export class PublicoModule {}
