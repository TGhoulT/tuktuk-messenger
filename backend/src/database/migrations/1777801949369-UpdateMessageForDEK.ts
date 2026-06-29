import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMessageForDEK1777801949369 implements MigrationInterface {
    name = 'UpdateMessageForDEK1777801949369'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedPayload"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "payloadIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "payloadAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "entities"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedDek" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "dekIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "dekAuthTag" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedContent" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "contentIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "contentAuthTag" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "clientMessageId" uuid`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "UQ_1b071fdf249018d0f914066ef1f" UNIQUE ("clientMessageId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "UQ_1b071fdf249018d0f914066ef1f"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "clientMessageId"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "contentAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "contentIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedContent"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "dekAuthTag"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "dekIv"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "encryptedDek"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "entities" jsonb`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "payloadAuthTag" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "payloadIv" bytea`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "encryptedPayload" bytea`);
    }

}
