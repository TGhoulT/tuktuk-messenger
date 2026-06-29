import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchableTextToMessages1778155572555 implements MigrationInterface {
    name = 'AddSearchableTextToMessages1778155572555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "searchableText" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "searchableText"`);
    }

}
