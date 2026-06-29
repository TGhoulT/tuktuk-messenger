import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameHiddenMessagesColumns1782683572486 implements MigrationInterface {
    name = 'RenameHiddenMessagesColumns1782683572486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hidden_messages" ADD "message_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" DROP CONSTRAINT "FK_292fec987c704a71bc9133f310c"`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ALTER COLUMN "messageId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ADD CONSTRAINT "FK_292fec987c704a71bc9133f310c" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hidden_messages" DROP CONSTRAINT "FK_292fec987c704a71bc9133f310c"`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ALTER COLUMN "messageId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" ADD CONSTRAINT "FK_292fec987c704a71bc9133f310c" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hidden_messages" DROP COLUMN "message_id"`);
    }

}
