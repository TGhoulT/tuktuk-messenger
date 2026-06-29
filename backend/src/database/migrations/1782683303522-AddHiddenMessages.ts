import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHiddenMessages1782683303522 implements MigrationInterface {
    name = 'AddHiddenMessages1782683303522'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hidden_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "messageId" uuid NOT NULL, "hiddenAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_edfc35c566cb53184ecaed043c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ADD CONSTRAINT "FK_29cceb774b9ec250b3c6afe5cf8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ADD CONSTRAINT "FK_292fec987c704a71bc9133f310c" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hidden_messages" DROP CONSTRAINT "FK_292fec987c704a71bc9133f310c"`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" DROP CONSTRAINT "FK_29cceb774b9ec250b3c6afe5cf8"`);
        await queryRunner.query(`DROP TABLE "hidden_messages"`);
    }

}
