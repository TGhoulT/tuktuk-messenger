import { MigrationInterface, QueryRunner } from "typeorm";

export class SetBioMaxLength1501777896559371 implements MigrationInterface {
    name = 'SetBioMaxLength1501777896559371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "bio" character varying(150)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
    }

}
