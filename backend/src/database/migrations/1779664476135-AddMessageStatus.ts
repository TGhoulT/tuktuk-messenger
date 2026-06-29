import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessageStatus1779664476135 implements MigrationInterface {
    name = 'AddMessageStatus1779664476135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."messages_status_enum" AS ENUM('sending', 'sent', 'delivered', 'read')`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    }

}
