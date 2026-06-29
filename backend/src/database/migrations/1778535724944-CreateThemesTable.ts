import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateThemesTable1778535724944 implements MigrationInterface {
    name = 'CreateThemesTable1778535724944'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "themes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "type" "public"."themes_type_enum" NOT NULL DEFAULT 'custom', "authorId" uuid, "variables" jsonb NOT NULL DEFAULT '{}', "thumbnailUrl" character varying, "previewColor" character varying, "previewEmoji" character varying, "isPublic" boolean NOT NULL DEFAULT false, "usageCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ddbeaab913c18682e5c88155592" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "themes" ADD CONSTRAINT "FK_197bc13fe5e0a1c4221865ad2ac" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "themes" DROP CONSTRAINT "FK_197bc13fe5e0a1c4221865ad2ac"`);
        await queryRunner.query(`DROP TABLE "themes"`);
    }

}
