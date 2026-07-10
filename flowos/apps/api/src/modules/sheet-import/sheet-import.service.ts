import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { AppError, ERROR_CODES, type ImportSheetInput, type PreviewSheetInput, type SheetColumnMapping } from '@flowos/shared';
import type { Prisma, Project } from '@flowos/database';
import { PRISMA, type Db } from '../../common/prisma.provider';
import { AuditService } from '../../common/services/audit.service';

interface RawSheetData {
  rows: unknown[][];
  sheetName: string;
  tabIndex: number;
  tabCount: number;
}

interface DetectedMapping {
  headerRowIndex: number;
  headers: string[];
  mapping: SheetColumnMapping;
}

interface ParsedRow {
  name: string;
  rawStatus: string;
  owner: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  start: Date | null;
  finish: Date | null;
  percent: number | null;
}

// Same heuristic as the Praeto Sheets dashboard's frontend parser — kept
// deliberately in sync so both tools guess columns the same way.
const KEYWORDS: Record<keyof SheetColumnMapping, string[]> = {
  name: ['project', 'task', 'name', 'title', 'item'],
  status: ['status', 'phase', 'stage'],
  owner: ['owner', 'assignee', 'who', 'responsible'],
  priority: ['priority', 'urgency'],
  start: ['start', 'begin'],
  finish: ['finish', 'end', 'due', 'deadline'],
  percent: ['%', 'percent', 'progress', 'complete'],
};

@Injectable()
export class SheetImportService {
  private readonly credentials: Record<string, unknown> | null;

  constructor(
    @Inject(PRISMA) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    const raw = this.config.get<string>('GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY');
    try {
      this.credentials = raw ? JSON.parse(raw) : null;
    } catch {
      this.credentials = null;
    }
  }

  get serviceAccountEmail(): string | null {
    return (this.credentials?.['client_email'] as string) ?? null;
  }

  private getSheetsClient() {
    if (!this.credentials) {
      throw new AppError(ERROR_CODES.SHEET_IMPORT_NOT_CONFIGURED, 'Google Sheets import is not configured on this server.', 503);
    }
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
  }

  private extractSheetId(input: string): string {
    const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m?.[1] ?? input.trim();
  }

  private extractGid(input: string): string | null {
    const m = input.match(/[#&?]gid=(\d+)/);
    return m?.[1] ?? null;
  }

  private async fetchRawRows(sheetUrl: string): Promise<RawSheetData> {
    const id = this.extractSheetId(sheetUrl);
    const gid = this.extractGid(sheetUrl);
    const sheets = this.getSheetsClient();

    let meta;
    try {
      meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    } catch (error) {
      const status = (error as { code?: number } | null)?.code;
      if (status === 404 || status === 403) {
        throw new AppError(
          ERROR_CODES.SHEET_NOT_SHARED,
          'Cannot access this spreadsheet — make sure it is shared with the service account.',
          403,
        );
      }
      throw error;
    }

    const allTabs = meta.data.sheets ?? [];
    let target = allTabs[0];
    if (gid !== null) {
      const found = allTabs.find((s) => String(s.properties?.sheetId) === gid);
      if (!found) {
        throw new AppError(
          ERROR_CODES.SHEET_TAB_NOT_FOUND,
          `That tab (gid=${gid}) no longer exists in this spreadsheet — it may have been deleted. This spreadsheet has ${allTabs.length} tab(s).`,
          404,
        );
      }
      target = found;
    }
    const sheetName = target?.properties?.title ?? 'Sheet1';
    const tabIndex = (target?.properties?.index ?? 0) + 1;

    const valuesResp = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: sheetName,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    return { rows: valuesResp.data.values ?? [], sheetName, tabIndex, tabCount: allTabs.length };
  }

  detectMapping(rows: unknown[][]): DetectedMapping {
    const scan = rows.slice(0, 15);
    let bestIdx = 0;
    let bestScore = -1;
    scan.forEach((row, i) => {
      let score = 0;
      (row ?? []).forEach((cell) => {
        const s = String(cell ?? '').toLowerCase();
        if (!s) return;
        Object.values(KEYWORDS).forEach((list) => {
          if (list.some((k) => s.includes(k))) score++;
        });
      });
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });

    const headerRow = (rows[bestIdx] ?? []).map((c) => String(c ?? ''));
    const mapping: SheetColumnMapping = { name: -1, status: -1, owner: -1, priority: -1, start: -1, finish: -1, percent: -1 };
    headerRow.forEach((cell, ci) => {
      const s = cell.toLowerCase();
      if (!s) return;
      for (const field of Object.keys(KEYWORDS) as (keyof SheetColumnMapping)[]) {
        if (mapping[field] === -1 && KEYWORDS[field].some((k) => s.includes(k))) {
          mapping[field] = ci;
          break;
        }
      }
    });
    if (mapping.name === -1) mapping.name = 0;

    return { headerRowIndex: bestIdx, headers: headerRow, mapping };
  }

  /** Free-text status -> board bucket, used only to guess a new stage's `isDone` flag. */
  private statusToStageBucket(raw: string): 'done' | 'blocked' | 'active' | 'todo' {
    const s = raw.toLowerCase();
    if (/done|complete|closed|shipped|resolved/.test(s)) return 'done';
    if (/block|stuck|risk|hold|delay/.test(s)) return 'blocked';
    if (/progress|active|doing|development|build|testing|uat|review|discovery/.test(s)) return 'active';
    return 'todo';
  }

  private normalizePriority(raw: string): 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' {
    const s = raw.trim().toLowerCase();
    if (s === 'urgent') return 'URGENT';
    if (s === 'high') return 'HIGH';
    if (s === 'low') return 'LOW';
    return 'NORMAL';
  }

  /** Google Sheets returns dates as the same 1899-12-30 epoch serial Excel uses. */
  private excelSerialToDate(v: unknown): Date | null {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && v > 40000) {
      return new Date(Math.round((v - 25569) * 86400000));
    }
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      const d = new Date(`${v.slice(0, 10)}T00:00:00.000Z`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  private percentFrom(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const num = typeof v === 'number' ? v : parseFloat(String(v).replace('%', ''));
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(100, Math.round(num <= 1 ? num * 100 : num)));
  }

  parseRows(rows: unknown[][], headerRowIndex: number, mapping: SheetColumnMapping): ParsedRow[] {
    const dataRows = rows.slice(headerRowIndex + 1);
    const parsed: ParsedRow[] = [];
    for (const row of dataRows) {
      const cell = (idx: number): unknown => (idx >= 0 && idx < row.length ? row[idx] : '');
      const name = mapping.name >= 0 ? String(cell(mapping.name) ?? '').trim() : '';
      if (!name) continue;
      parsed.push({
        name,
        rawStatus: mapping.status >= 0 ? String(cell(mapping.status) ?? '').trim() : '',
        owner: mapping.owner >= 0 ? String(cell(mapping.owner) ?? '').trim() : '',
        priority: mapping.priority >= 0 ? this.normalizePriority(String(cell(mapping.priority) ?? '')) : 'NORMAL',
        start: mapping.start >= 0 ? this.excelSerialToDate(cell(mapping.start)) : null,
        finish: mapping.finish >= 0 ? this.excelSerialToDate(cell(mapping.finish)) : null,
        percent: mapping.percent >= 0 ? this.percentFrom(cell(mapping.percent)) : null,
      });
    }
    return parsed;
  }

  // ------------------------------------------------------------------
  // Public API used by the controller
  // ------------------------------------------------------------------

  async preview(input: PreviewSheetInput) {
    const raw = await this.fetchRawRows(input.sheetUrl);
    const detected = this.detectMapping(raw.rows);
    const mapping: SheetColumnMapping = input.mapping ? { ...detected.mapping, ...input.mapping } : detected.mapping;
    const headerRowIndex = input.headerRowIndex ?? detected.headerRowIndex;
    const parsedRows = this.parseRows(raw.rows, headerRowIndex, mapping);
    const distinctOwners = [...new Set(parsedRows.map((r) => r.owner).filter(Boolean))];

    return {
      sheetName: raw.sheetName,
      tabIndex: raw.tabIndex,
      tabCount: raw.tabCount,
      headers: detected.headers,
      headerRowIndex,
      suggestedMapping: detected.mapping,
      mapping,
      rowCount: parsedRows.length,
      previewRows: parsedRows.slice(0, 10),
      distinctOwners,
    };
  }

  async createProjectFromSheet(tenantId: string, actorId: string, input: ImportSheetInput): Promise<Project> {
    const raw = await this.fetchRawRows(input.sheetUrl);
    const gid = this.extractGid(input.sheetUrl);
    const parsedRows = this.parseRows(raw.rows, input.headerRowIndex, input.mapping);

    // One Stage per distinct status text, in order of first appearance.
    const stageOrder: string[] = [];
    for (const row of parsedRows) {
      const key = row.rawStatus || 'Imported';
      if (!stageOrder.includes(key)) stageOrder.push(key);
    }

    const project = await this.db.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          tenantId,
          name: input.projectName,
          status: 'PLANNING',
          ownerId: actorId,
          customFields: {},
          currency: 'USD',
        },
      });

      const stageIdByLabel = new Map<string, string>();
      for (const [i, label] of stageOrder.entries()) {
        const bucket = this.statusToStageBucket(label === 'Imported' ? '' : label);
        const stage = await tx.stage.create({
          data: { projectId: created.id, name: label, key: `imported-${i}`, order: i, isDone: bucket === 'done' },
        });
        stageIdByLabel.set(label, stage.id);
      }

      for (const row of parsedRows) {
        const stageId = stageIdByLabel.get(row.rawStatus || 'Imported');
        const assigneeId = row.owner ? input.ownerMap[row.owner] : undefined;
        await tx.task.create({
          data: {
            tenantId,
            projectId: created.id,
            stageId,
            title: row.name,
            priority: row.priority,
            startDate: row.start,
            dueDate: row.finish,
            progress: row.percent ?? 0,
            customFields: (row.owner ? { importedOwner: row.owner } : {}) as Prisma.InputJsonValue,
            ...(assigneeId ? { assignees: { create: [{ userId: assigneeId }] } } : {}),
          },
        });
      }

      await tx.projectSheetImport.create({
        data: {
          projectId: created.id,
          sheetUrl: input.sheetUrl,
          sheetGid: gid,
          headerRowIndex: input.headerRowIndex,
          mapping: input.mapping as unknown as Prisma.InputJsonValue,
          ownerMap: input.ownerMap as unknown as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
          lastRowCount: parsedRows.length,
        },
      });

      return created;
    });

    await this.db.activity.create({
      data: {
        tenantId,
        actorId,
        entityType: 'project',
        entityId: project.id,
        action: 'project.imported_from_sheet',
        data: { sheetUrl: input.sheetUrl, rowCount: parsedRows.length } as Prisma.InputJsonValue,
      },
    });
    this.audit.writeAudit({
      tenantId,
      userId: actorId,
      action: 'project.imported_from_sheet',
      entityType: 'project',
      entityId: project.id,
    });

    return project;
  }

  async resync(tenantId: string, actorId: string, projectId: string): Promise<{ created: number; updated: number }> {
    const project = await this.db.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } });
    if (!project) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

    const importRecord = await this.db.projectSheetImport.findUnique({ where: { projectId } });
    if (!importRecord) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'This project was not created from a Google Sheet import.', 422);
    }

    const mapping = importRecord.mapping as unknown as SheetColumnMapping;
    const ownerMap = importRecord.ownerMap as unknown as Record<string, string>;
    const raw = await this.fetchRawRows(importRecord.sheetUrl);
    const parsedRows = this.parseRows(raw.rows, importRecord.headerRowIndex, mapping);

    const existingStages = await this.db.stage.findMany({ where: { projectId, deletedAt: null } });
    const stageIdByLabel = new Map(existingStages.map((s) => [s.name, s.id]));
    let nextOrder = existingStages.length;

    const existingTasks = await this.db.task.findMany({ where: { projectId, tenantId, deletedAt: null } });
    const taskByTitle = new Map(existingTasks.map((t) => [t.title, t]));

    let created = 0;
    let updated = 0;

    await this.db.$transaction(async (tx) => {
      for (const row of parsedRows) {
        const label = row.rawStatus || 'Imported';
        let stageId = stageIdByLabel.get(label);
        if (!stageId) {
          const bucket = this.statusToStageBucket(label === 'Imported' ? '' : label);
          const stage = await tx.stage.create({
            data: { projectId, name: label, key: `imported-${nextOrder}`, order: nextOrder, isDone: bucket === 'done' },
          });
          nextOrder++;
          stageId = stage.id;
          stageIdByLabel.set(label, stageId);
        }

        const assigneeId = row.owner ? ownerMap[row.owner] : undefined;
        const existing = taskByTitle.get(row.name);
        const customFields = (row.owner ? { importedOwner: row.owner } : {}) as Prisma.InputJsonValue;

        if (existing) {
          await tx.task.update({
            where: { id: existing.id },
            data: {
              stageId,
              priority: row.priority,
              startDate: row.start,
              dueDate: row.finish,
              progress: row.percent ?? 0,
              customFields,
              ...(assigneeId ? { assignees: { deleteMany: {}, create: [{ userId: assigneeId }] } } : {}),
            },
          });
          updated++;
        } else {
          await tx.task.create({
            data: {
              tenantId,
              projectId,
              stageId,
              title: row.name,
              priority: row.priority,
              startDate: row.start,
              dueDate: row.finish,
              progress: row.percent ?? 0,
              customFields,
              ...(assigneeId ? { assignees: { create: [{ userId: assigneeId }] } } : {}),
            },
          });
          created++;
        }
      }

      await tx.projectSheetImport.update({
        where: { projectId },
        data: { lastSyncedAt: new Date(), lastRowCount: parsedRows.length },
      });
    });

    this.audit.writeAudit({
      tenantId,
      userId: actorId,
      action: 'project.sheet_resynced',
      entityType: 'project',
      entityId: projectId,
      metadata: { created, updated },
    });
    return { created, updated };
  }

  async getImportInfo(
    tenantId: string,
    projectId: string,
  ): Promise<{ linked: boolean; lastSyncedAt: string | null; lastRowCount: number | null }> {
    const project = await this.db.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null }, select: { id: true } });
    if (!project) throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found', 404);

    const record = await this.db.projectSheetImport.findUnique({ where: { projectId } });
    if (!record) return { linked: false, lastSyncedAt: null, lastRowCount: null };
    return { linked: true, lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null, lastRowCount: record.lastRowCount };
  }
}
