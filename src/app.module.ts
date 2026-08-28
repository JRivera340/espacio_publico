import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ActividadesModule } from './actividades/actividades.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmConfig), AuthModule, ActividadesModule],
  controllers: [AppController],
})
export class AppModule {}
