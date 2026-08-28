import {
  IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional,
  IsString, IsUrl, MaxLength, Min, ValidateIf,
} from 'class-validator';
import { OperativoSubtipo } from '../enums/operativo-subtipo.enum';
import { Turno } from '../enums/turno.enum';

export class UpdateActividadDto {
  @IsOptional()
  @IsEnum(OperativoSubtipo)
  operativoSubtipo?: OperativoSubtipo;

  @IsOptional()
  @IsEnum(Turno)
  shift?: Turno;

  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;

  @IsOptional()
  @IsISO8601()
  dateTime?: string;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  barrio?: string;

  // Acepta keys relativas ("photos/uuid.jpg") o URLs completas.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  results?: string;

  @IsOptional() @IsNumber() @Min(0)
  incautacionLicores?: number;

  @IsOptional() @IsNumber() @Min(0)
  incautacionArmasBlancas?: number;

  @IsOptional() @IsNumber() @Min(0)
  personasTransladadas?: number;

  @IsOptional() @IsNumber() @Min(0)
  personasSensibilizadas?: number;

  // Cifra propia de los operativos 1801.
  @IsOptional() @IsNumber() @Min(0)
  num_1801?: number;

  @IsOptional() @IsString() @MaxLength(5000)
  actaOperativo?: string;

  @IsOptional()
  @ValidateIf((o) => o.actaPdfUrl !== undefined && o.actaPdfUrl !== null && o.actaPdfUrl !== '')
  @IsString()
  @IsUrl({ require_protocol: false })
  actaPdfUrl?: string;

  @IsOptional()
  @ValidateIf((o) => o.entidadResponsable !== undefined && o.entidadResponsable !== null && o.entidadResponsable !== '')
  @IsString()
  entidadResponsable?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  entidadesAcompanantes?: string[];

  @IsOptional() @IsBoolean()
  isGroupOperativo?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true })
  gestoresInvolucradosIds?: string[];

  // Respuestas del formulario dinamico. JSONB libre, sin forma fija.
  @IsOptional()
  dynamicAnswers?: Record<string, any>;

  @IsOptional()
  @IsString()
  createdByUserId?: string;
}
