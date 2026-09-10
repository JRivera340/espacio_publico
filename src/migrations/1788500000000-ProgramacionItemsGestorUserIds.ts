import { MigrationInterface, QueryRunner } from "typeorm";

export class ProgramacionItemsGestorUserIds1788500000000 implements MigrationInterface {
    name = 'ProgramacionItemsGestorUserIds1788500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_gestorUserId"`);
        await queryRunner.query(`ALTER TABLE "programacion_items" ADD "gestorUserIds" uuid[] NOT NULL DEFAULT '{}'`);
        // Una tarea que ya tenia un gestor asignado queda con ese mismo gestor
        // como unico elemento del arreglo - no se pierde nada al migrar.
        await queryRunner.query(`UPDATE "programacion_items" SET "gestorUserIds" = ARRAY["gestorUserId"] WHERE "gestorUserId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "programacion_items" DROP COLUMN "gestorUserId"`);
        // GIN, no btree: las consultas son "contiene a este id" (&&, @>), no
        // igualdad exacta de arreglo.
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_gestorUserIds" ON "programacion_items" USING GIN ("gestorUserIds")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_programacion_items_gestorUserIds"`);
        await queryRunner.query(`ALTER TABLE "programacion_items" ADD "gestorUserId" uuid`);
        await queryRunner.query(`UPDATE "programacion_items" SET "gestorUserId" = "gestorUserIds"[1] WHERE array_length("gestorUserIds", 1) > 0`);
        await queryRunner.query(`ALTER TABLE "programacion_items" DROP COLUMN "gestorUserIds"`);
        await queryRunner.query(`CREATE INDEX "IDX_programacion_items_gestorUserId" ON "programacion_items" ("gestorUserId")`);
    }
}
