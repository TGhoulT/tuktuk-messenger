import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageAndFileEntities1775076819605 implements MigrationInterface {
    name = 'AddMessageAndFileEntities1775076819605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."files_type_enum" AS ENUM('image', 'video', 'audio', 'document', 'sticker', 'sticker_animated', 'voice', 'avatar')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "originalName" character varying NOT NULL, "mimeType" character varying NOT NULL, "size" integer NOT NULL, "type" "public"."files_type_enum" NOT NULL, "sendAsDocument" boolean NOT NULL DEFAULT false, "thumbnailId" character varying, "metadata" jsonb NOT NULL DEFAULT '{}', "ownerId" uuid, "chatId" uuid, "localPath" character varying, "encryptedKey" bytea, "keyIv" bytea, "usedCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'file', 'media', 'voice', 'sticker', 'forward')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatId" uuid NOT NULL, "senderId" uuid NOT NULL, "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text', "text" text, "fileId" uuid, "mediaGroupId" uuid, "isMediaGroup" boolean NOT NULL DEFAULT false, "forwardedFromMessageId" uuid, "forwardedFromChatId" uuid, "forwardedFromUserId" uuid, "forwardOptions" jsonb, "reactions" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_500d64127ca9df75640c19af40" ON "messages" ("chatId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" uuid NOT NULL, "contactId" uuid NOT NULL, "localName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "message_reactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "messageId" uuid NOT NULL, "userId" uuid NOT NULL, "reaction" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_654a9f0059ff93a8f156be66a5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b1d7d194912ce67ccab3bbe202" ON "message_reactions" ("messageId", "userId", "reaction") `);
        await queryRunner.query(`CREATE TABLE "sticker_packs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "title" character varying NOT NULL, "authorId" uuid, "stickerIds" jsonb NOT NULL DEFAULT '[]', "thumbnailId" character varying, "isSystem" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_40f07529d33c5cd8db707799b93" UNIQUE ("name"), CONSTRAINT "PK_a27381efea0f876f5d3233af655" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorite_stickers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "stickerFileId" uuid NOT NULL, "order" integer NOT NULL DEFAULT '0', "addedAt" TIMESTAMP NOT NULL DEFAULT now(), "stickerId" uuid, CONSTRAINT "PK_59c2f161144b856d6b6e3603241" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_a23484d1055e34d75b25f616792" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_c7e92b912fe78131ef62133edbc" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_024625f04919187fe7386ce70bb" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_270a85b7f2d4b6821dc7642e6a8" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_2f2eeb268dcaf6e7f1c2176949f" FOREIGN KEY ("contactId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_7623d77216e8457a552490259e0" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_82d59cb474d00eea46d7e192f28" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite_stickers" ADD CONSTRAINT "FK_dc6f21c3cf89427927cc48ee684" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite_stickers" ADD CONSTRAINT "FK_c91ef95c30b5f756e44962e83a9" FOREIGN KEY ("stickerId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "favorite_stickers" DROP CONSTRAINT "FK_c91ef95c30b5f756e44962e83a9"`);
        await queryRunner.query(`ALTER TABLE "favorite_stickers" DROP CONSTRAINT "FK_dc6f21c3cf89427927cc48ee684"`);
        await queryRunner.query(`ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_82d59cb474d00eea46d7e192f28"`);
        await queryRunner.query(`ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_7623d77216e8457a552490259e0"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_2f2eeb268dcaf6e7f1c2176949f"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_270a85b7f2d4b6821dc7642e6a8"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_024625f04919187fe7386ce70bb"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_c7e92b912fe78131ef62133edbc"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_a23484d1055e34d75b25f616792"`);
        await queryRunner.query(`DROP TABLE "favorite_stickers"`);
        await queryRunner.query(`DROP TABLE "sticker_packs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1d7d194912ce67ccab3bbe202"`);
        await queryRunner.query(`DROP TABLE "message_reactions"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_500d64127ca9df75640c19af40"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "public"."files_type_enum"`);
    }

}
