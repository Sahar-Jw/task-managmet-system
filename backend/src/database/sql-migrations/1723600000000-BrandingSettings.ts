import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `branding_settings`, a singleton table holding the app's
 * white-label config (site name, logo, favicon, SEO metadata) edited from
 * the Settings > Branding page. The app only ever reads/writes the single
 * oldest row (see BrandingService.getOrCreate) — no seed insert needed,
 * it's created lazily with defaults on first access.
 */
export class BrandingSettings1723600000000 implements MigrationInterface {
  name = 'BrandingSettings1723600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branding_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "site_name" varchar(150) NOT NULL DEFAULT 'Task & Project Manager',
        "logo_url" varchar(255),
        "favicon_url" varchar(255),
        "meta_title" varchar(150),
        "meta_description" varchar(300),
        "meta_keywords" varchar(300),
        "updated_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branding_settings"`);
  }
}
