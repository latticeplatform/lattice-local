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
import kafkaConnectService from '../services/kafkaConnectService.js';

describe('createConnector', () => {
  beforeEach(() => vi.resetAllMocks());

  it('merges Avro converter defaults for the Postgres connector before posting', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { name: 'test', config: {}, tasks: [], type: 'source' },
    });

    await kafkaConnectService.createConnector({
      name: 'test',
      config: {
        'connector.class': 'io.debezium.connector.postgresql.PostgresConnector',
        'database.hostname': 'pg',
      },
    });

    expect(axios.post).toHaveBeenCalledOnce();
    const [, sentBody] = vi.mocked(axios.post).mock.calls.at(0) ?? [];
    const config = (sentBody as { config: Record<string, string> }).config;
    expect(config['key.converter']).toBe('io.apicurio.registry.utils.converter.AvroConverter');
    expect(config['key.converter.apicurio.registry.auto-register']).toBe('true');
    expect(config['database.hostname']).toBe('pg');
  });

  it('merges unwrap transform defaults for the ClickHouse connector', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

    await kafkaConnectService.createConnector({
      name: 'sink',
      config: { 'connector.class': 'com.clickhouse.kafka.connect.ClickHouseSinkConnector' },
    });

    const [, sentBody] = vi.mocked(axios.post).mock.calls.at(0) ?? [];
    const config = (sentBody as { config: Record<string, string> }).config;
    expect(config['transforms']).toBe('unwrap');
    expect(config['transforms.unwrap.type']).toBe('io.debezium.transforms.ExtractNewRecordState');
  });
});

describe('getConnectors', () => {
  beforeEach(() => vi.resetAllMocks());

  it('attaches autofilled_keys to each connector entry', async () => {
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

    const result = await kafkaConnectService.getConnectors();
    const keys = result['pg-connector'].autofilled_keys;
    expect(keys).toContain('key.converter');
    expect(keys).toContain('key.converter.apicurio.registry.auto-register');
    expect(keys).not.toContain('transforms');
  });
});
