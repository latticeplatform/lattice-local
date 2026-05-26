import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import type { KafkaJSService } from '../types/index.js';
import createKafkaJSRouter from '../routes/kafkaJSRouter.js';

const makeService = (overrides: Partial<KafkaJSService> = {}): KafkaJSService =>
  ({
    describeCluster: vi.fn(),
    listTopics: vi.fn(),
    getTopicMetadata: vi.fn(),
    getTopicOffsets: vi.fn(),
    createTopics: vi.fn(),
    deleteTopic: vi.fn(),
    produce: vi.fn(),
    peekTopicSchema: vi.fn(),
    createStreamConsumer: vi.fn(),
    ...overrides,
  }) as unknown as KafkaJSService;

const buildApp = (service: KafkaJSService) => {
  const app = express();
  app.use(express.json());
  app.use('/', createKafkaJSRouter(service));
  return app;
};

describe('GET /brokers', () => {
  it('returns cluster info from the service', async () => {
    const cluster = { brokers: [{ nodeId: 1, host: 'b1', port: 9092 }], controller: 1, clusterId: 'abc' };
    const res = await request(buildApp(makeService({ describeCluster: vi.fn().mockResolvedValue(cluster) }))).get('/brokers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(cluster);
  });

  it('returns 500 when the service throws', async () => {
    const res = await request(buildApp(makeService({ describeCluster: vi.fn().mockRejectedValue(new Error('Kafka down')) }))).get('/brokers');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Kafka down');
  });
});

describe('POST /produce', () => {
  it('forwards messages to the service and returns 201', async () => {
    const service = makeService({ produce: vi.fn().mockResolvedValue([]) });
    const res = await request(buildApp(service))
      .post('/produce')
      .send({ topic: 'my-topic', messages: [{ value: 'hello' }] });
    expect(res.status).toBe(201);
    expect(service.produce).toHaveBeenCalledWith('my-topic', [{ value: 'hello' }]);
  });

  it('returns 400 when topic is missing', async () => {
    const res = await request(buildApp(makeService()))
      .post('/produce')
      .send({ messages: [{ value: 'hello' }] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when messages is not an array', async () => {
    const res = await request(buildApp(makeService()))
      .post('/produce')
      .send({ topic: 'my-topic', messages: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when messages array is empty', async () => {
    const res = await request(buildApp(makeService()))
      .post('/produce')
      .send({ topic: 'my-topic', messages: [] });
    expect(res.status).toBe(400);
  });

  it('returns 500 when the service throws', async () => {
    const service = makeService({ produce: vi.fn().mockRejectedValue(new Error('broker error')) });
    const res = await request(buildApp(service))
      .post('/produce')
      .send({ topic: 'my-topic', messages: [{ value: 'hello' }] });
    expect(res.status).toBe(500);
  });
});