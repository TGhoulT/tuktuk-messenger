import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserGif1778086525995 implements MigrationInterface {
    name = 'AddUserGif1778086525995'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_gifs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "fileId" uuid NOT NULL, "rank" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f2e1db85b8bccd89e643268b21b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_gifs" ADD CONSTRAINT "FK_1ec3f1e98cf915b0eac45458a09" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_gifs" ADD CONSTRAINT "FK_00e5a0331784f87836a370deff2" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_gifs" DROP CONSTRAINT "FK_00e5a0331784f87836a370deff2"`);
        await queryRunner.query(`ALTER TABLE "user_gifs" DROP CONSTRAINT "FK_1ec3f1e98cf915b0eac45458a09"`);
        await queryRunner.query(`DROP TABLE "user_gifs"`);
    }

}
