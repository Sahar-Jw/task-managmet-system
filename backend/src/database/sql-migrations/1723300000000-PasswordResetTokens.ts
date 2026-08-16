import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `password_reset_tokens`, backing the forgot-password / reset-password
 * flow (POST /auth/forgot-password, POST /auth/reset-password). Mirrors the
 * refresh_tokens table: only a SHA-256 hash of the raw token is stored, and
 * `used_at` marks a token as consumed so it can't be replayed.
 */
export class PasswordResetTokens1723300000000 implements MigrationInterface {
  name = 'PasswordResetTokens1723300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_password_reset_tokens_user" ON "password_reset_tokens" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
