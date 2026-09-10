import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ProgramacionEstado } from '../enums/programacion-estado.enum';

// La planeacion (que hace el validador) contra la ejecucion (que hace el
// gestor via ActividadEntity): son dos tablas separadas a proposito. Esta
// entidad no referencia ActividadEntity con una FK real, solo guarda el uuid
// en actividadId cuando la actividad real la cumple.
@Entity('programacion_items')
export class ProgramacionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'timestamptz' })
  fecha: Date;

  // Puede faltar: a veces se programa por zona sin barrio exacto todavia.
  @Index()
  @Column({ type: 'character varying', nullable: true })
  barrio?: string | null;

  @Column({ type: 'text' })
  descripcion: string;

  // Puede estar vacio hasta que el validador decida a quien se lo asigna, o
  // tener varios gestores a la vez - una tarea puede repartirse entre el
  // equipo, y si cualquiera de ellos la completa cuenta para todos.
  @Index()
  @Column({ type: 'uuid', array: true, default: '{}' })
  gestorUserIds: string[];

  @Index()
  @Column({ type: 'uuid' })
  creadoPorUserId: string;

  @Index()
  @Column({ type: 'enum', enum: ProgramacionEstado, default: ProgramacionEstado.PENDIENTE })
  estado: ProgramacionEstado;

  // La actividad real que cumplio esta programacion, cuando exista.
  @Column({ type: 'uuid', nullable: true })
  actividadId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
