import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHiddenMessagesIndexes1782685054587 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Индекс для быстрого поиска по user_id
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hidden_messages_user_id ON hidden_messages("userId");`);
        // Индекс для быстрого поиска по message_id
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hidden_messages_message_id ON hidden_messages("messageId");`);
        // Составной индекс для пары (user_id, message_id) – ускоряет проверки существования
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hidden_messages_user_message ON hidden_messages("userId", "messageId");`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_hidden_messages_user_message;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_hidden_messages_message_id;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_hidden_messages_user_id;`);
    }
}