import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ActividadStatus } from '../enums/actividad-status.enum';
import { OperativoSubtipo } from '../enums/operativo-subtipo.enum';
import { Turno } from '../enums/turno.enum';

// El nombre lleva el sufijo Entity a proposito: `Actividad` a secas es el tipo
// de SALIDA que define actividades.repository.ts (fechas como string ISO).
// Son dos formas distintas del mismo concepto y tenerlas con el mismo nombre
// obliga a aliasear en cada import.
@Entity('actividades')
export class ActividadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  createdByUserId: string;

  @Index()
  @Column({ type: 'enum', enum: ActividadStatus, default: ActividadStatus.BORRADOR })
  status: ActividadStatus;

  @Index()
  @Column({ type: 'timestamptz' })
  dateTime: Date;

  @Column()
  activityType: string;

  @Index()
  @Column({ type: 'enum', enum: OperativoSubtipo, default: OperativoSubtipo.ESPACIO_PUBLICO_1801 })
  operativoSubtipo: OperativoSubtipo;

  @Index()
  @Column({ type: 'enum', enum: Turno, default: Turno.DIURNO })
  shift: Turno;

  @Index()
  @Column({ type: 'boolean', nullable: true, default: false })
  isNightShift?: boolean;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  @Index()
  @Column()
  barrio: string;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column({ type: 'text' })
  results: string;

  @Column({ type: 'int', default: 0 })
  incautacionLicores: number;

  @Column({ type: 'int', default: 0 })
  incautacionArmasBlancas: number;

  @Column({ type: 'int', default: 0 })
  personasTransladadas: number;

  @Column({ type: 'int', default: 0 })
  personasSensibilizadas: number;

  // Unica cifra estructurada propia del area (operativos 1801).
  @Column({ type: 'int', nullable: true, default: null })
  num_1801?: number | null;

  @Column({ type: 'text', nullable: true })
  actaOperativo?: string | null;

  @Column({ type: 'text', nullable: true })
  actaPdfUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  entidadResponsable?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  entidadesAcompanantes: string[];

  @Column({ type: 'boolean', default: false })
  isGroupOperativo: boolean;

  // Sin tabla de usuarios en este modulo: se guardan los uuid del hub y los
  // nombres se resuelven por users-proxy cuando hacen falta.
  @Column({ type: 'uuid', array: true, default: '{}' })
  gestoresInvolucradosIds: string[];

  @Index()
  @Column({ type: 'uuid', nullable: true })
  validatorUserId?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  validationNotes?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  // Respuestas del formulario dinamico de gov_encuestas_publico. JSONB libre:
  // puede traer texto de observaciones y datos de personas, asi que nada de
  // aca sale por el visor publico sin pasar por la allowlist de public-fields.
  @Column({ type: 'jsonb', nullable: true })
  dynamicAnswers?: Record<string, any> | null;

  // Numeracion visible correlativa (EP-01, EP-02...).
  @Index()
  @Column({ type: 'int', nullable: true, default: null })
  categorySeq?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
