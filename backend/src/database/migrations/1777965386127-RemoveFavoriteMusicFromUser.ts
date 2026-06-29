import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveFavoriteMusicFromUser1777965386127 implements MigrationInterface {
    name = 'RemoveFavoriteMusicFromUser1777965386127'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "favoriteMusic"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "favoriteMusic" text`);
    }

}
