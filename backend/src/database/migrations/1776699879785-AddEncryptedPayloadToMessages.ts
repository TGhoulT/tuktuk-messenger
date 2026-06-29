import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEncryptedPayloadToMessages1776699879785 implements MigrationInterface {
    name = 'AddEncryptedPayloadToMessages1776699879785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "text"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedText"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "textIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "textAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedPayload" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "payloadIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "payloadAuthTag" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "entities" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "entities"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "payloadAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "payloadIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedPayload"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "textAuthTag" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "textIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedText" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "text" text`);
    }

}
