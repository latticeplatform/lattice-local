import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

import axios from 'axios';
import express from 'express';
import request from 'supertest';
import createKafkaConnectRouter from '../routes/kafkaConnectRouter.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/', createKafkaConnectRouter());
  return app;
};

describe('POST /connectors', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when connector.class is missing', async () => {
    const res = await request(buildApp()).post('/connectors').send({ name: 'test', config: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/connector\.class/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns 400 when config is absent from the body', async () => {
    const res = await request(buildApp()).post('/connectors').send({ name: 'test' });
    expect(res.status).toBe(400);
  });

  it('merges Avro converter defaults for the Postgres connector before forwarding', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { name: 'test', config: {}, tasks: [], type: 'source' },
    });

    await request(buildApp())
      .post('/connectors')
      .send({
        name: 'test',
        config: {
          'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
          'database.hostname': 'pg',
        },
      });

    expect(axios.post).toHaveBeenCalledOnce();
    const [, sentBody] = vi.mocked(axios.post).mock.calls[0]!;
    const config = (sentBody as { config: Record<string, string> }).config;
    expect(config['key.converter']).toBe('io.apicurio.registry.utils.converter.AvroConverter');
    expect(config['key.converter.apicurio.registry.auto-register']).toBe('true');
    expect(config['database.hostname']).toBe('pg');
  });

  it('merges unwrap transform defaults for the ClickHouse connector', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

    await request(buildApp())
      .post('/connectors')
      .send({
        name: 'sink',
        config: { 'connector.class': 'com.clickhouse.kafka.connect.ClickHouseSinkConnector' },
      });

    const [, sentBody] = vi.mocked(axios.post).mock.calls[0]!;
    const config = (sentBody as { config: Record<string, string> }).config;
    expect(config['transforms']).toBe('unwrap');
    expect(config['transforms.unwrap.type']).toBe('io.debezium.transforms.ExtractNewRecordState');
  });

  it('returns 502 when Kafka Connect is unreachable', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    vi.mocked(axios.isAxiosError).mockReturnValue(false);

    const res = await request(buildApp())
      .post('/connectors')
      .send({
        name: 'test',
        config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
      });
    expect(res.status).toBe(502);
  });

  it('passes through Kafka Connect error status and body', async () => {
    const connectError = {
      isAxiosError: true,
      response: { status: 409, data: { error_code: 409, message: 'already exists' } },
    };
    vi.mocked(axios.post).mockRejectedValueOnce(connectError);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const res = await request(buildApp())
      .post('/connectors')
      .send({
        name: 'test',
        config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
      });
    expect(res.status).toBe(409);
  });
});

describe('GET /connectors', () => {
  beforeEach(() => vi.resetAllMocks());

  it('includes autofilled_keys for each connector in the response', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        'pg-connector': {
          info: {
            config: { 'connector.class': 'io.debezium.connector.postgresql.PostgresConnector' },
            type: 'source',
          },
          status: { connector: { state: 'RUNNING' }, tasks: [] },
        },
      },
    });

    const res = await request(buildApp()).get('/connectors');
    expect(res.status).toBe(200);
    const keys: string[] = res.body['pg-connector'].autofilled_keys;
    expect(keys).toContain('key.converter');
    expect(keys).toContain('key.converter.apicurio.registry.auto-register');
    expect(keys).not.toContain('transforms');
  });
});
