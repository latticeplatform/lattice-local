import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: {
    isAxiosError: vi.fn(),
  },
}));

import axios from 'axios';
import express from 'express';
import request from 'supertest';
import createKafkaConnectRouter from '../routes/kafkaConnectRouter.js';
import type { KafkaConnectService } from '../types';

const makeService = (overrides: Partial<KafkaConnectService> = {}): KafkaConnectService =>
  ({
    getConnectors: vi.fn(),
    getConnector: vi.fn(),
    createConnector: vi.fn(),
    deleteConnector: vi.fn(),
    pauseConnector: vi.fn(),
    resumeConnector: vi.fn(),
    restartConnector: vi.fn(),
    restartTask: vi.fn(),
    getPlugins: vi.fn(),
    getPluginConfig: vi.fn(),
    validatePluginConfig: vi.fn(),
    getTopics: vi.fn(),
    ...overrides,
  }) as unknown as KafkaConnectService;

const buildApp = (service: KafkaConnectService) => {
  const app = express();
  app.use(express.json());
  app.use('/', createKafkaConnectRouter(service));
  return app;
};

describe('POST /connectors', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when connector.class is missing', async () => {
    const res = await request(buildApp(makeService()))
      .post('/connectors')
      .send({ name: 'test', config: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/connector\.class/);
  });

  it('returns 400 when config is absent from the body', async () => {
    const res = await request(buildApp(makeService())).post('/connectors').send({ name: 'test' });
    expect(res.status).toBe(400);
  });

  it('delegates to service.createConnector with the request body and returns 201', async () => {
    const body = {
      name: 'test',
      config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
    };
    const result = { name: 'test', config: {}, tasks: [], type: 'source' };
    const svc = makeService({ createConnector: vi.fn().mockResolvedValueOnce(result) });
    const res = await request(buildApp(svc)).post('/connectors').send(body);
    expect(res.status).toBe(201);
    expect(svc.createConnector).toHaveBeenCalledWith(body);
    expect(res.body).toEqual(result);
  });

  it('returns 502 when service throws a non-axios error', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    const svc = makeService({
      createConnector: vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
    });
    const res = await request(buildApp(svc))
      .post('/connectors')
      .send({
        name: 'test',
        config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
      });
    expect(res.status).toBe(502);
  });

  it('proxies Kafka Connect error status and body', async () => {
    const connectError = {
      isAxiosError: true,
      response: { status: 409, data: { error_code: 409, message: 'already exists' } },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    const svc = makeService({ createConnector: vi.fn().mockRejectedValueOnce(connectError) });
    const res = await request(buildApp(svc))
      .post('/connectors')
      .send({
        name: 'test',
        config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
      });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error_code: 409, message: 'already exists' });
  });
});

describe('GET /connectors', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the service result as JSON', async () => {
    const connectors = {
      'pg-connector': {
        info: { name: 'pg-connector', config: {}, tasks: [], type: 'source' },
        status: {
          name: 'pg-connector',
          type: 'source',
          connector: { state: 'RUNNING', worker_id: '' },
          tasks: [],
        },
        autofilled_keys: ['key.converter', 'key.converter.apicurio.registry.auto-register'],
      },
    };
    const svc = makeService({ getConnectors: vi.fn().mockResolvedValueOnce(connectors) });
    const res = await request(buildApp(svc)).get('/connectors');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(connectors);
  });
});
