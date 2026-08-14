import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';

/**
 * Singleton table: exactly one row holds the whole app's white-label
 * config (site name, logo, favicon, SEO metadata). The service always
 * reads/creates/updates the single oldest row rather than looking up by
 * id, so callers never need to know a row id exists.
 */
@Entity('branding_settings')
export class BrandingSettingsEntity extends BaseEntity {
  @Column({ name: 'site_name', type: 'varchar', length: 150, default: 'Task & Project Manager' })
  siteName!: string;

  // e.g. "/branding-assets/xyz.png"; null falls back to the frontend's built-in default.
  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl?: string;

  // e.g. "/branding-assets/abc.ico"; null falls back to the frontend's built-in default.
  @Column({ name: 'favicon_url', type: 'varchar', length: 255, nullable: true })
  faviconUrl?: string;

  // Browser tab title / <title>. Falls back to siteName when empty.
  @Column({ name: 'meta_title', type: 'varchar', length: 150, nullable: true })
  metaTitle?: string;

  @Column({ name: 'meta_description', type: 'varchar', length: 300, nullable: true })
  metaDescription?: string;

  // Comma-separated keywords for the <meta name="keywords"> tag.
  @Column({ name: 'meta_keywords', type: 'varchar', length: 300, nullable: true })
  metaKeywords?: string;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById?: string;
}
