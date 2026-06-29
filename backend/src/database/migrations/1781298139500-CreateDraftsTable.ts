import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDraftsTable1781298139500 implements MigrationInterface {
    name = 'CreateDraftsTable1781298139500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "chatId" uuid NOT NULL, "encryptedText" bytea NOT NULL, "iv" bytea NOT NULL, "authTag" bytea NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0598e229012c6cbd4ccbba97328" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0746f666300743aff06789b2a2" ON "drafts" ("userId", "chatId") `);
        await queryRunner.query(`ALTER TABLE "drafts" ADD CONSTRAINT "FK_6b4e9f2a1131fc1e9c5ba6ceaeb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "drafts" ADD CONSTRAINT "FK_dc558aad51857977ab9dd012fe2" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "drafts" DROP CONSTRAINT "FK_dc558aad51857977ab9dd012fe2"`);
        await queryRunner.query(`ALTER TABLE "drafts" DROP CONSTRAINT "FK_6b4e9f2a1131fc1e9c5ba6ceaeb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0746f666300743aff06789b2a2"`);
        await queryRunner.query(`DROP TABLE "drafts"`);
    }

}
