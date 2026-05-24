import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import type { KafkaJSService } from '../types/index.js';
import createKafkaJSTopicRouter from '../routes/kafkaJSTopicRouter.js';

const makeService = (overrides: Partial<KafkaJSService> = {}): KafkaJSService =>
  ({
    listTopics: vi.fn().mockResolvedValue([]),
    getTopicMetadata: vi.fn().mockResolvedValue(null),
    getTopicOffsets: vi.fn().mockResolvedValue([]),
    createTopics: vi.fn().mockResolvedValue(true),
    deleteTopic: vi.fn().mockResolvedValue(undefined),
    describeCluster: vi.fn(),
    produce: vi.fn(),
    peekTopicSchema: vi.fn(),
    createStreamConsumer: vi.fn(),
    ...overrides,
  }) as unknown as KafkaJSService;

const buildApp = (service: KafkaJSService) => {
  const app = express();
  app.use(express.json());
  app.use('/', createKafkaJSTopicRouter(service));
  return app;
};

describe('GET /', () => {
  it('returns the topic list from the service', async () => {
    const service = makeService({ listTopics: vi.fn().mockResolvedValue(['topic-a', 'topic-b']) });
    const res = await request(buildApp(service)).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['topic-a', 'topic-b']);
  });

  it('returns 500 when the service throws', async () => {
    const service = makeService({ listTopics: vi.fn().mockRejectedValue(new Error('broker error')) });
    const res = await request(buildApp(service)).get('/');
    expect(res.status).toBe(500);
  });
});

describe('POST /', () => {
  it('creates topics and returns 201', async () => {
    const service = makeService({ createTopics: vi.fn().mockResolvedValue(true) });
    const res = await request(buildApp(service))
      .post('/')
      .send({ topics: [{ topic: 'new-topic' }] });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
  });

  it('passes numPartitions and replicationFactor to the service', async () => {
    const service = makeService({ createTopics: vi.fn().mockResolvedValue(true) });
    await request(buildApp(service))
      .post('/')
      .send({ topics: [{ topic: 'new-topic', numPartitions: 3, replicationFactor: 2 }] });
    expect(service.createTopics).toHaveBeenCalledWith([
      { topic: 'new-topic', numPartitions: 3, replicationFactor: 2 },
    ]);
  });

  it('returns 400 when topics array is empty', async () => {
    const res = await request(buildApp(makeService())).post('/').send({ topics: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when topics is missing from the body', async () => {
    const res = await request(buildApp(makeService())).post('/').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /:name/metadata', () => {
  it('calls service.getTopicMetadata with the topic name', async () => {
    const meta = { name: 'my-topic', partitions: [] };
    const service = makeService({ getTopicMetadata: vi.fn().mockResolvedValue(meta) });
    const res = await request(buildApp(service)).get('/my-topic/metadata');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(meta);
    expect(service.getTopicMetadata).toHaveBeenCalledWith('my-topic');
  });
});

describe('GET /:name/offsets', () => {
  it('calls service.getTopicOffsets with the topic name', async () => {
    const offsets = [{ partition: 0, earliest: '0', latest: '10', high: '10', low: '0' }];
    const service = makeService({ getTopicOffsets: vi.fn().mockResolvedValue(offsets) });
    const res = await request(buildApp(service)).get('/my-topic/offsets');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(offsets);
    expect(service.getTopicOffsets).toHaveBeenCalledWith('my-topic');
  });
});

describe('GET /:name/schema', () => {
  it('calls service.peekTopicSchema with the topic name', async () => {
    const schema = { source: 'debezium-json', schema: { type: 'record' } };
    const service = makeService({ peekTopicSchema: vi.fn().mockResolvedValue(schema) });
    const res = await request(buildApp(service)).get('/my-topic/schema');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(schema);
    expect(service.peekTopicSchema).toHaveBeenCalledWith('my-topic');
  });
});

describe('DELETE /:name', () => {
  it('deletes the topic and returns 204', async () => {
    const service = makeService({ deleteTopic: vi.fn().mockResolvedValue(undefined) });
    const res = await request(buildApp(service)).delete('/my-topic');
    expect(res.status).toBe(204);
    expect(service.deleteTopic).toHaveBeenCalledWith('my-topic');
  });

  it('returns 500 when the service throws', async () => {
    const service = makeService({ deleteTopic: vi.fn().mockRejectedValue(new Error('cannot delete')) });
    const res = await request(buildApp(service)).delete('/my-topic');
    expect(res.status).toBe(500);
  });
});