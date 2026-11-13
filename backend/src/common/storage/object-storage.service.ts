import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream, existsSync, statSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { NextFunction, Request, Response } from 'express';
import {
  getStorageDirectory,
  storagePathFromUrl,
} from './storage.util';

export type StorageCategory = 'avatars' | 'branding' | 'attachments';

export interface StoredObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

/*
 * Unified file storage.
 *
 * S3 mode is ON when S3_BUCKET is set (together with AWS_ENDPOINT_URL,
 * AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY). Otherwise everything keeps
 * using the local ./storage folder exactly as before.
 *
 * The value stored in the database stays `/storage/<category>/YYYY/MM/<file>`
 * in both modes. The S3 object key is the same path without the `/storage/`
 * prefix, so existing rows keep working and local files written before the
 * switch are still readable (S3 miss -> local disk fallback).
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client?: S3Client;
  private readonly bucket?: string;

  constructor() {
    const bucket = process.env.S3_BUCKET?.trim();
    const endpoint =
      process.env.AWS_ENDPOINT_URL?.trim() ||
      process.env.S3_ENDPOINT?.trim();

    if (bucket && endpoint) {
      this.bucket = bucket;
      this.client = new S3Client({
        endpoint,
        region: process.env.AWS_REGION || 'us-east-1',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
        // Many S3-compatible stores reject the SDK's default CRC32 checksums.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        // credentials are read from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
      });
      this.logger.log(`S3 storage enabled (bucket ${bucket} @ ${endpoint})`);
    } else {
      this.logger.log('S3 storage disabled, using local ./storage');
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  /* Store a file and return the DB url: /storage/<category>/YYYY/MM/<uuid>.<ext> */
  async save(
    category: StorageCategory,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ): Promise<string> {
    const now = new Date();
    const key = [
      category,
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
    ].join('/');

    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
          ContentLength: file.buffer.length,
        }),
      );
    } else {
      const dir = getStorageDirectory(category, now);
      await writeFile(join(dir, key.split('/').pop() as string), file.buffer);
    }

    return `/storage/${key}`;
  }

  /* Delete by DB url. Never throws. */
  async remove(url?: string | null): Promise<void> {
    const key = this.keyFromUrl(url);
    if (!key) return;

    if (this.client) {
      await this.client
        .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch((e) => this.logger.warn(`S3 delete failed for ${key}: ${e?.message}`));
    }

    // Also clear any legacy local copy.
    const local = storagePathFromUrl(url);
    if (local) await unlink(local).catch(() => undefined);
  }

  /* Read by DB url. Returns null when the file does not exist. */
  async read(url?: string | null): Promise<StoredObject | null> {
    const key = this.keyFromUrl(url);
    if (!key) return null;

    if (this.client) {
      try {
        const out = await this.client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        if (out.Body) {
          return {
            body: out.Body as Readable,
            contentType: out.ContentType,
            contentLength: out.ContentLength,
          };
        }
      } catch (e: any) {
        const missing =
          e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
        if (!missing) throw e;
      }
    }

    // Local fallback (disk mode, or files uploaded before S3 was enabled).
    const local = storagePathFromUrl(url);
    if (local && existsSync(local)) {
      return {
        body: createReadStream(local),
        contentLength: statSync(local).size,
      };
    }
    return null;
  }

  /*
   * Express handler for the PUBLIC categories (avatars, branding), mounted
   * at /<PUBLIC_BASE_PATH>/storage/<category>. Never mount attachments here.
   */
  publicHandler(category: 'avatars' | 'branding') {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      try {
        const rel = decodeURIComponent(req.path).replace(/^\/+/, '');
        if (!rel || rel.includes('..') || rel.includes('\0')) {
          return res.status(404).end();
        }
        const obj = await this.read(`/storage/${category}/${rel}`);
        if (!obj) return res.status(404).end();

        res.setHeader(
          'Content-Type',
          obj.contentType || 'application/octet-stream',
        );
        if (obj.contentLength != null) {
          res.setHeader('Content-Length', String(obj.contentLength));
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.method === 'HEAD') {
          obj.body.destroy();
          return res.end();
        }
        obj.body.on('error', () => res.destroy());
        obj.body.pipe(res);
      } catch (e) {
        next(e);
      }
    };
  }

  private keyFromUrl(url?: string | null): string | null {
    if (!url) return null;
    let p = url;
    if (/^https?:\/\//i.test(url)) {
      try {
        p = new URL(url).pathname;
      } catch {
        return null;
      }
    }
    const i = p.indexOf('/storage/');
    if (i === -1) return null;
    const key = p.slice(i + '/storage/'.length);
    if (!key || key.includes('..') || key.includes('\0')) return null;
    return key;
  }
}
