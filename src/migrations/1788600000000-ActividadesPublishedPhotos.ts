import { MigrationInterface, QueryRunner } from "typeorm";

export class ActividadesPublishedPhotos1788600000000 implements MigrationInterface {
    name = 'ActividadesPublishedPhotos1788600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "actividades" ADD "publishedPhotos" text array NOT NULL DEFAULT '{}'`);

        // Backfill: lo que ya se consideraba publicado (APROBADA por datos
        // historicos del hub, PUBLICADA por el flujo actual) arranca con
        // publishedPhotos igual a photos, para no perder de golpe lo que el
        // visor publico ya venia mostrando. Filas sin aprobar quedan en el
        // default vacio.
        await queryRunner.query(`
            UPDATE "actividades"
            SET "publishedPhotos" = "photos"
            WHERE "status" IN ('APROBADA', 'PUBLICADA')
              AND array_length("photos", 1) > 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "actividades" DROP COLUMN "publishedPhotos"`);
    }
}
