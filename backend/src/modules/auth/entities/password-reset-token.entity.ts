import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * A short-lived, single-use token issued by POST /auth/forgot-password and
 * consumed by POST /auth/reset-password. Only the SHA-256 hash of the raw
 * token is ever persisted (same pattern as RefreshTokenEntity) so a leaked
 * database row can't be replayed as a working reset link.
 */
@Entity('password_reset_tokens')
@Index(['userId'])
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'token_hash', type: 'varchar', length: 255, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
