import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramacionItemEntity } from './entities/programacion-item.entity';
import { ProgramacionController } from './programacion.controller';
import { ProgramacionService } from './programacion.service';
import { PROGRAMACION_REPOSITORY } from './programacion.tokens';
import { TypeOrmProgramacionRepository } from './programacion.repository.typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramacionItemEntity]), AuthModule],
  controllers: [ProgramacionController],
  providers: [
    ProgramacionService,
    { provide: PROGRAMACION_REPOSITORY, useClass: TypeOrmProgramacionRepository },
  ],
  exports: [ProgramacionService],
})
export class ProgramacionModule {}
