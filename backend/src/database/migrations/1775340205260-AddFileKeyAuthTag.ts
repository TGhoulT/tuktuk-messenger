import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFileKeyAuthTag1775340205260 implements MigrationInterface {
    name = 'AddFileKeyAuthTag1775340205260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" ADD "keyAuthTag" bytea`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "keyAuthTag"`);
    }

}
