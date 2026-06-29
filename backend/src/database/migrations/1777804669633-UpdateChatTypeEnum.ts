import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChatTypeEnum1777804669633 implements MigrationInterface {
    name = 'UpdateChatTypeEnum1777804669633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."chats_type_enum" RENAME TO "chats_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."chats_type_enum" AS ENUM('dialog', 'group', 'channel', 'saved', 'system')`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" TYPE "public"."chats_type_enum" USING "type"::"text"::"public"."chats_type_enum"`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" SET DEFAULT 'dialog'`);
        await queryRunner.query(`DROP TYPE "public"."chats_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."chats_type_enum_old" AS ENUM('dialog', 'group', 'channel')`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" TYPE "public"."chats_type_enum_old" USING "type"::"text"::"public"."chats_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "type" SET DEFAULT 'dialog'`);
        await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."chats_type_enum_old" RENAME TO "chats_type_enum"`);
    }

}
