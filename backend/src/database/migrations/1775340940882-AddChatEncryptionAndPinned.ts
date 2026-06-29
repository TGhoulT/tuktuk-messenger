import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatEncryptionAndPinned1775340940882 implements MigrationInterface {
    name = 'AddChatEncryptionAndPinned1775340940882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" ADD "pinnedMessageId" uuid`);
        await queryRunner.query(`ALTER TABLE "chats" ADD "encryptedKey" bytea`);
        await queryRunner.query(`ALTER TABLE "chats" ADD "keyIv" bytea`);
        await queryRunner.query(`ALTER TABLE "chats" ADD "keyAuthTag" bytea`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "keyAuthTag"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "keyIv"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "encryptedKey"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "pinnedMessageId"`);
    }

}
