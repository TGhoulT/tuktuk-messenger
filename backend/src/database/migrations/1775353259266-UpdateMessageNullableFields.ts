import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMessageNullableFields1775353259266 implements MigrationInterface {
    name = 'UpdateMessageNullableFields1775353259266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedText" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "textIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "textAuthTag" bytea`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "textAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "textIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedText"`);
    }

}
