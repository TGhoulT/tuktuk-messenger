import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFavoriteTracks1777882769585 implements MigrationInterface {
    name = 'AddFavoriteTracks1777882769585'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "favorite_tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "trackName" character varying NOT NULL, "artistName" character varying, "order" integer NOT NULL DEFAULT '0', "addedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d34ad5c55c7d5448fad8c4ced7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "favorite_tracks" ADD CONSTRAINT "FK_800ecc034a9516116d6dcd20b26" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "favorite_tracks" DROP CONSTRAINT "FK_800ecc034a9516116d6dcd20b26"`);
        await queryRunner.query(`DROP TABLE "favorite_tracks"`);
    }

}
