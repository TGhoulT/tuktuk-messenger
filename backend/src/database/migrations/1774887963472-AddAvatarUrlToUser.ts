import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUrlToUser1774887963472 implements MigrationInterface {
    name = 'AddAvatarUrlToUser1774887963472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarUrl" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
    }

}
