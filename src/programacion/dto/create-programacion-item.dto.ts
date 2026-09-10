import {
  IsArray, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { ProgramacionEstado } from '../enums/programacion-estado.enum';

export class CreateProgramacionItemDto {
  @IsISO8601()
  @IsNotEmpty()
  fecha!: string;

  @IsOptional()
  @IsString()
  barrio?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion!: string;

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
