import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateActividades1787863956372 implements MigrationInterface {
    name = 'CreateActividades1787863956372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "actividades" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdByUserId" uuid NOT NULL, "status" "public"."actividades_status_enum" NOT NULL DEFAULT 'BORRADOR', "dateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "activityType" character varying NOT NULL, "operativoSubtipo" "public"."actividades_operativosubtipo_enum" NOT NULL DEFAULT 'ESPACIO_PUBLICO_1801', "shift" "public"."actividades_shift_enum" NOT NULL DEFAULT 'DIURNO', "isNightShift" boolean DEFAULT false, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "barrio" character varying NOT NULL, "photos" text array NOT NULL DEFAULT '{}', "results" text NOT NULL, "incautacionLicores" integer NOT NULL DEFAULT '0', "incautacionArmasBlancas" integer NOT NULL DEFAULT '0', "personasTransladadas" integer NOT NULL DEFAULT '0', "personasSensibilizadas" integer NOT NULL DEFAULT '0', "num_1801" integer, "actaOperativo" text, "actaPdfUrl" text, "entidadResponsable" text, "entidadesAcompanantes" text array NOT NULL DEFAULT '{}', "isGroupOperativo" boolean NOT NULL DEFAULT false, "gestoresInvolucradosIds" uuid array NOT NULL DEFAULT '{}', "validatorUserId" uuid, "validatedAt" TIMESTAMP WITH TIME ZONE, "validationNotes" text, "publishedAt" TIMESTAMP WITH TIME ZONE, "dynamicAnswers" jsonb, "categorySeq" integer, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03490866fef1c23456f0e289d9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7c78ad25f700030d0873a7f250" ON "actividades" ("createdByUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6cacd6e021243b0061ea0087b9" ON "actividades" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_df2b9c7f10995afbc216975049" ON "actividades" ("dateTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_918f1c2a37cb2a7f199f2636f3" ON "actividades" ("operativoSubtipo") `);
        await queryRunner.query(`CREATE INDEX "IDX_e8a41d5f8cb59a9d36fe16492f" ON "actividades" ("shift") `);
        await queryRunner.query(`CREATE INDEX "IDX_608d1e79f08daffb1d242ce318" ON "actividades" ("isNightShift") `);
        await queryRunner.query(`CREATE INDEX "IDX_f20c154785390df1663afcad05" ON "actividades" ("barrio") `);
        await queryRunner.query(`CREATE INDEX "IDX_038c0792cfa928bfd5b2674d48" ON "actividades" ("validatorUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5e08e2932b8ed40f598535f36" ON "actividades" ("categorySeq") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e5e08e2932b8ed40f598535f36"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_038c0792cfa928bfd5b2674d48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f20c154785390df1663afcad05"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_608d1e79f08daffb1d242ce318"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8a41d5f8cb59a9d36fe16492f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_918f1c2a37cb2a7f199f2636f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df2b9c7f10995afbc216975049"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6cacd6e021243b0061ea0087b9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c78ad25f700030d0873a7f250"`);
        await queryRunner.query(`DROP TABLE "actividades"`);
    }

}
