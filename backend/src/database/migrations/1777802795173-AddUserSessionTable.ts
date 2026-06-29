import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSessionTable1777802795173 implements MigrationInterface {
    name = 'AddUserSessionTable1777802795173'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "sessionId" character varying NOT NULL, "ipAddress" character varying, "userAgent" character varying, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5f2c875043dcf84df7b73ed73" ON "user_sessions" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_7b9f84752e80b31e2978fcf0d9" ON "user_sessions" ("userId", "sessionId") `);
        await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_55fa4db8406ed66bc7044328427"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7b9f84752e80b31e2978fcf0d9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5f2c875043dcf84df7b73ed73"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
    }

}
