import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProgramacionItems1788211241568 implements MigrationInterface {
    name = 'CreateProgramacionItems1788211241568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Extension para uuid_generate_v4(), usada como default de "id" mas
        // abajo. IF NOT EXISTS: idempotente, ya la crea la migracion de
        // actividades si corre antes.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // No existe "CREATE TYPE IF NOT EXISTS" en Postgres: bloque
        // condicional para que la migracion sea idempotente.
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programacion_items_estado_enum') THEN
                    CREATE TYPE "public"."programacion_items_estado_enum" AS ENUM('PENDIENTE', 'CUMPLIDA', 'CANCELADA');
                END IF;
            END $$;
        `);

        await queryRunner.query(`CREATE TABLE "programacion_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha" TIMESTAMP WITH TIME ZONE NOT NULL, "barrio" character varying, "descripcion" text NOT NULL, "gestorUserId" uuid, "creadoPorUserId" uuid NOT NULL, "estado" "public"."programacion_items_estado_enum" NOT NULL DEFAULT 'PENDIENTE', "actividadId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_programacion_items_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_fecha" ON "programacion_items" ("fecha") `);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_barrio" ON "programacion_items" ("barrio") `);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_gestorUserId" ON "programacion_items" ("gestorUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_creadoPorUserId" ON "programacion_items" ("creadoPorUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_estado" ON "programacion_items" ("estado") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_estado"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_creadoPorUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_gestorUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_barrio"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_fecha"`);
        await queryRunner.query(`DROP TABLE "programacion_items"`);
        await queryRunner.query(`DROP TYPE "public"."programacion_items_estado_enum"`);
    }

}
