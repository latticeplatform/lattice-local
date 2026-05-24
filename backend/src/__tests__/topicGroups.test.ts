import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import createTopicGroupRouter from '../routes/topicGroupRouter.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/', createTopicGroupRouter(new Map()));
  return app;
};

describe('topic group router', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
  });

  describe('GET /', () => {
    it('returns an empty array when no groups exist', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('lists all created groups', async () => {
      await request(app).post('/').send({ name: 'alpha' });
      await request(app).post('/').send({ name: 'beta' });
      const res = await request(app).get('/');
      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /', () => {
    it('creates a group with topics and returns 201', async () => {
      const res = await request(app).post('/').send({ name: 'group-a', topics: ['t1', 't2'] });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ name: 'group-a', topics: ['t1', 't2'] });
    });

    it('defaults topics to an empty array when omitted', async () => {
      const res = await request(app).post('/').send({ name: 'group-b' });
      expect(res.status).toBe(201);
      expect(res.body.topics).toEqual([]);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/').send({ topics: [] });
      expect(res.status).toBe(400);
    });

    it('returns 400 when name is a blank string', async () => {
      const res = await request(app).post('/').send({ name: '   ' });
      expect(res.status).toBe(400);
    });

    it('returns 409 on duplicate name', async () => {
      await request(app).post('/').send({ name: 'dup' });
      const res = await request(app).post('/').send({ name: 'dup' });
      expect(res.status).toBe(409);
    });
  });

  describe('PUT /:name', () => {
    it('updates the topic list', async () => {
      await request(app).post('/').send({ name: 'editable', topics: ['old'] });
      const res = await request(app).put('/editable').send({ topics: ['new'] });
      expect(res.status).toBe(200);
      expect(res.body.topics).toEqual(['new']);
    });

    it('renames the group', async () => {
      await request(app).post('/').send({ name: 'old-name' });
      const res = await request(app).put('/old-name').send({ name: 'new-name', topics: [] });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('new-name');
    });

    it('returns 409 when renaming to an already-taken name', async () => {
      await request(app).post('/').send({ name: 'first' });
      await request(app).post('/').send({ name: 'second' });
      const res = await request(app).put('/first').send({ name: 'second', topics: [] });
      expect(res.status).toBe(409);
    });

    it('returns 404 for a non-existent group', async () => {
      const res = await request(app).put('/ghost').send({ topics: [] });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:name', () => {
    it('removes the group and returns 204', async () => {
      await request(app).post('/').send({ name: 'to-delete' });
      const res = await request(app).delete('/to-delete');
      expect(res.status).toBe(204);
    });

    it('returns 404 for a non-existent group', async () => {
      const res = await request(app).delete('/ghost');
      expect(res.status).toBe(404);
    });

    it('the group is absent from GET after deletion', async () => {
      await request(app).post('/').send({ name: 'gone' });
      await request(app).delete('/gone');
      const res = await request(app).get('/');
      expect(res.body).toEqual([]);
    });
  });
});