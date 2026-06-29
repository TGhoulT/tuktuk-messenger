import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFileIvAndAuthTag1775339903313 implements MigrationInterface {
    name = 'AddFileIvAndAuthTag1775339903313'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" ADD "iv" bytea`);
        await queryRunner.query(`ALTER TABLE "files" ADD "authTag" bytea`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "authTag"`);
        await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "iv"`);
    }

}
