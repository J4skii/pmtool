import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Thin wrapper over S3/MinIO presigned URL generation. */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'flowos-files';
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
    });
  }

  /** Tenant-prefixed object key keeps blobs partitioned per tenant. */
  buildKey(tenantId: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${tenantId}/${crypto.randomUUID()}/${safeName}`;
  }

  async presignPut(key: string, mimeType: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType }),
      { expiresIn: 900 },
    );
  }

  async presignGet(key: string, downloadName?: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(downloadName
          ? { ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, '')}"` }
          : {}),
      }),
      { expiresIn: 900 },
    );
  }
}
