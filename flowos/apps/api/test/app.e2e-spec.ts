/**
 * API e2e scaffolding (supertest against the NestJS app).
 *
 * These tests are placeholders until the NestJS AppModule lands.
 * Pattern to follow once apps/api/src exists:
 *
 *   import { Test } from '@nestjs/testing';
 *   import { INestApplication } from '@nestjs/common';
 *   import request from 'supertest';
 *   import { AppModule } from '../src/app.module';
 *
 *   let app: INestApplication;
 *   beforeAll(async () => {
 *     const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
 *     app = moduleRef.createNestApplication();
 *     await app.init();
 *   });
 *   afterAll(() => app.close());
 *
 *   it('GET /v1/health returns { data: { status: "ok" } }', () =>
 *     request(app.getHttpServer()).get('/v1/health').expect(200));
 */

describe('FlowOS API (e2e scaffolding)', () => {
  it('placeholder — replace with supertest specs when AppModule exists', () => {
    expect(true).toBe(true);
  });
});
