import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceShortNameToStickerPack1778516038181 implements MigrationInterface {
    name = 'AddSourceShortNameToStickerPack1778516038181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_files_original_name_trgm"`);
        await queryRunner.query(`ALTER TABLE "sticker_packs" ADD "sourceShortName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sticker_packs" DROP COLUMN "sourceShortName"`);
        await queryRunner.query(`CREATE INDEX "idx_files_original_name_trgm" ON "files" ("originalName") `);
    }

}
