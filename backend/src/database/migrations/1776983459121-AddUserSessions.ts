import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSessions1776983459121 implements MigrationInterface {
    name = 'AddUserSessions1776983459121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "sessionId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "sessionId"`);
    }

}
