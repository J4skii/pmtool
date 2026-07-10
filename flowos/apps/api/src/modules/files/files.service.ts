import { Inject, Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@flowos/shared';
import type { File, Folder, Prisma } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';
import { StorageService } from './storage.service';
import type { ConfirmUploadInput, CreateFolderInput, ListFilesQuery, PresignUploadInput } from './files.dto';

/** Conservative allowlist; extend per-tenant via settings later. */
const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'text/',
  'application/pdf',
  'application/zip',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
];

const MAX_SIZE_BYTES = Number(process.env.FILE_MAX_SIZE_BYTES ?? 100 * 1024 * 1024);

type FileRow = Prisma.FileGetPayload<{ include: { versions: { orderBy: { version: 'desc' }; take: 1 } } }>;

@Injectable()
export class FilesService {
  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async presignUpload(
    tenantId: string,
    input: PresignUploadInput,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    this.validateUpload(input.mimeType, input.sizeBytes);
    const storageKey = this.storage.buildKey(tenantId, input.name);
    const uploadUrl = await this.storage.presignPut(storageKey, input.mimeType);
    return { uploadUrl, storageKey };
  }

  async confirmUpload(tenantId: string, userId: string, input: ConfirmUploadInput): Promise<FileRow> {
    this.validateUpload(input.mimeType, input.sizeBytes);

    const file = await this.db.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          tenantId,
          projectId: input.projectId,
          taskId: input.taskId,
          folderId: input.folderId,
          name: input.name,
          mimeType: input.mimeType,
          tags: input.tags,
          expiresAt: input.expiresAt,
          clientVisible: input.clientVisible,
        },
      });
      await tx.fileVersion.create({
        data: {
          fileId: created.id,
          version: 1,
          storageKey: input.storageKey,
          sizeBytes: BigInt(input.sizeBytes),
          checksum: input.checksum,
          uploadedById: userId,
        },
      });
      return created;
    });

    this.audit.writeAudit({ tenantId, userId, action: 'file.uploaded', entityType: 'file', entityId: file.id });
    return this.requireFile(tenantId, file.id);
  }

  async addVersion(tenantId: string, userId: string, fileId: string, input: ConfirmUploadInput): Promise<FileRow> {
    const file = await this.requireFile(tenantId, fileId);
    const latest = file.versions[0]?.version ?? 0;
    await this.db.fileVersion.create({
      data: {
        fileId,
        version: latest + 1,
        storageKey: input.storageKey,
        sizeBytes: BigInt(input.sizeBytes),
        checksum: input.checksum,
        uploadedById: userId,
      },
    });
    this.audit.writeAudit({ tenantId, userId, action: 'file.version_added', entityType: 'file', entityId: fileId });
    return this.requireFile(tenantId, fileId);
  }

  async downloadUrl(tenantId: string, userId: string, fileId: string): Promise<{ url: string }> {
    const file = await this.requireFile(tenantId, fileId);
    const latest = file.versions[0];
    if (!latest) throw new AppError(ERROR_CODES.NOT_FOUND, 'File has no stored versions', 404);
    this.audit.writeAudit({ tenantId, userId, action: 'file.downloaded', entityType: 'file', entityId: fileId });
    return { url: await this.storage.presignGet(latest.storageKey, file.name) };
  }

  async list(tenantId: string, query: ListFilesQuery): Promise<FileRow[]> {
    return this.db.file.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.folderId ? { folderId: query.folderId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { tags: { has: query.search.toLowerCase() } },
                { ocrText: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Contracts/permits/insurance expiring within `days`. */
  async expiring(tenantId: string, days: number): Promise<File[]> {
    const horizon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.db.file.findMany({
      where: { tenantId, deletedAt: null, expiresAt: { not: null, lte: horizon, gte: new Date() } },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async softDelete(tenantId: string, userId: string, fileId: string): Promise<{ id: string }> {
    await this.requireFile(tenantId, fileId);
    await this.db.file.update({ where: { id: fileId }, data: { deletedAt: new Date() } });
    this.audit.writeAudit({ tenantId, userId, action: 'file.deleted', entityType: 'file', entityId: fileId });
    return { id: fileId };
  }

  // --- Folders ---

  async createFolder(tenantId: string, input: CreateFolderInput): Promise<Folder> {
    return this.db.folder.create({ data: { tenantId, ...input } });
  }

  async listFolders(tenantId: string, projectId?: string): Promise<Folder[]> {
    return this.db.folder.findMany({
      where: { tenantId, deletedAt: null, projectId: projectId ?? null },
      orderBy: { name: 'asc' },
    });
  }

  async deleteFolder(tenantId: string, folderId: string): Promise<{ id: string }> {
    const folder = await this.db.folder.findFirst({ where: { id: folderId, tenantId, deletedAt: null } });
    if (!folder) throw new AppError(ERROR_CODES.NOT_FOUND, 'Folder not found', 404);
    await this.db.folder.update({ where: { id: folderId }, data: { deletedAt: new Date() } });
    return { id: folderId };
  }

  // --- Helpers ---

  private validateUpload(mimeType: string, sizeBytes: number): void {
    if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
      throw new AppError(ERROR_CODES.FILE_TYPE_NOT_ALLOWED, `File type ${mimeType} is not allowed`, 422);
    }
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new AppError(ERROR_CODES.FILE_TOO_LARGE, `Files are limited to ${MAX_SIZE_BYTES} bytes`, 413);
    }
  }

  private async requireFile(tenantId: string, fileId: string): Promise<FileRow> {
    const file = await this.db.file.findFirst({
      where: { id: fileId, tenantId, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!file) throw new AppError(ERROR_CODES.NOT_FOUND, 'File not found', 404);
    return file;
  }
}
