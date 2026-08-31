import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ActividadesModule } from './actividades/actividades.module';
import { ProgramacionModule } from './programacion/programacion.module';
import { UsersProxyModule } from './users-proxy/users-proxy.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { FilesModule } from './files/files.module';
import { PublicoModule } from './publico/publico.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync(typeOrmConfig),
    AuthModule,
    ActividadesModule,
    ProgramacionModule,
    UsersProxyModule,
    CatalogosModule,
    FilesModule,
    PublicoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
