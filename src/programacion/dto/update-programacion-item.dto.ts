import {
  IsArray, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { ProgramacionEstado } from '../enums/programacion-estado.enum';

export class UpdateProgramacionItemDto {
  @IsOptional()
  @IsISO8601()
  fecha?: string;

  @IsOptional()
  @IsString()
  barrio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  gestorUserIds?: string[];

  @IsOptional()
  @IsEnum(ProgramacionEstado)
  estado?: ProgramacionEstado;

  @IsOptional()
  @IsUUID()
  actividadId?: string;
}
