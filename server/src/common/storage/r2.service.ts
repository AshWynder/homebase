import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

/** Images only. This endpoint must never become general-purpose file storage. */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** DeleteObjects accepts at most 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000;

/** Every key R2 needs before it can serve a single upload. */
export const REQUIRED_R2_ENV = [
  'ACCOUNT_ID',
  'ACCESS_KEY_ID',
  'SECRET_ACCESS_KEY',
  'BUCKET_NAME',
  'PUBLIC_URL',
] as const;

export interface UploadedObject {
  /** Bare object key, e.g. `maintenance/<ticketId>/<uuid>.jpg`. */
  key: string;
  /** Absolute, publicly reachable URL. */
  url: string;
  contentType: string;
  size: number;
}

/**
 * Cloudflare R2 client.
 *
 * R2 speaks the S3 API, so this uses the AWS SDK against the account endpoint
 * rather than a bespoke HTTP client — same signature, retries and error shapes
 * as every other S3-backed service.
 *
 * Env (see .env.development):
 *  ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME, PUBLIC_URL
 *
 * Objects are keyed by caller-supplied prefix so an entire aggregate's files
 * can be reaped with a single prefix delete (see `deletePrefix`).
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);

  private readonly accountId = process.env.ACCOUNT_ID ?? '';
  private readonly bucket = process.env.BUCKET_NAME ?? '';
  private readonly publicUrl = (process.env.PUBLIC_URL ?? '').replace(
    /\/$/,
    '',
  );

  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      // R2 is addressed per-account, not per-region; 'auto' is what R2 expects.
      region: 'auto',
      // Path-style keeps the bucket in the request path. R2's account endpoint
      // is not a wildcard-DNS host the SDK's virtual-host style would need.
      forcePathStyle: true,
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  get isConfigured(): boolean {
    return this.missingConfigKeys.length === 0;
  }

  /**
   * Which of the required env keys are absent or blank.
   *
   * Naming them is the point: a bare `isConfigured === false` tells an operator
   * only that "something" is wrong, which is a miserable thing to debug when
   * the likely cause is a server process started before the keys were added to
   * its env file and never restarted.
   */
  get missingConfigKeys(): string[] {
    return REQUIRED_R2_ENV.filter((key) => !process.env[key]?.trim());
  }

  /** One-line summary for boot logs and error messages. */
  describeConfiguration(): string {
    const missing = this.missingConfigKeys;
    return missing.length
      ? `missing env: ${missing.join(', ')}`
      : `bucket=${this.bucket} via ${this.publicUrl}`;
  }

  /** Absolute URL for a stored key. */
  urlFor(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /** True if the key belongs to `prefix`, so one tenant's delete cannot sweep another's files. */
  static isWithinPrefix(key: string, prefix: string): boolean {
    return key.startsWith(prefix);
  }

  /**
   * Builds a collision-proof key under `prefix`. The random component matters
   * because camera uploads from two tenants can land in the same millisecond.
   */
  buildKey(prefix: string, filename: string): string {
    const dot = filename.lastIndexOf('.');
    const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase() : 'jpg';
    const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'jpg';
    return `${prefix.replace(/\/+$/, '')}/${randomUUID()}.${safeExt}`;
  }

  /**
   * Uploads one object. Failures propagate: the caller decides whether a
   * partial upload set should be rolled back, which it must, or the bucket
   * accumulates objects that no row references.
   */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<UploadedObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      key,
      url: this.urlFor(key),
      contentType,
      size: body.byteLength,
    };
  }

  /**
   * Deletes specific keys.
   *
   * Separate from `deletePrefix` because that one lists with a trailing slash,
   * so passing it a bare object key would find nothing. Used to roll back a
   * partially-uploaded batch where the keys are already known.
   */
  async deleteKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
      const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }

    this.logger.log(`Deleted ${keys.length} object(s) by key`);
    return keys.length;
  }

  /**
   * Removes every object under `prefix`.
   *
   * Listing is paginated and deletions are batched because R2 caps both. Keys
   * are re-checked against the prefix as a guard: a truncated or otherwise
   * unexpected listing must never widen into deleting neighbouring objects.
   */
  async deletePrefix(prefix: string): Promise<number> {
    const normalised = `${prefix.replace(/\/+$/, '')}/`;
    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: normalised,
          ContinuationToken: continuationToken,
        }),
      );

      const keys = (listed.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => !!key && R2Service.isWithinPrefix(key, normalised));

      if (keys.length > 0) {
        for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
          const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
          await this.client.send(
            new DeleteObjectsCommand({
              Bucket: this.bucket,
              Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
            }),
          );
          deleted += batch.length;
        }
      }

      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined;
    } while (continuationToken);

    if (deleted > 0) {
      this.logger.log(`Deleted ${deleted} object(s) under ${normalised}`);
    }

    return deleted;
  }
}
