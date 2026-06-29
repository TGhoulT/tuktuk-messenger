import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserBioAndMusic1777876281467 implements MigrationInterface {
    name = 'AddUserBioAndMusic1777876281467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "favoriteMusic" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "favoriteMusic"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    }

}
