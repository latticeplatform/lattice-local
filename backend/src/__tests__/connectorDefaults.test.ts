import { describe, it, expect } from 'vitest';
import { applyDefaults, getAutofilledKeys, CONNECTOR_DEFAULTS } from '../connectorDefaults.js';

const POSTGRES = 'io.debezium.connector.postgresql.PostgresConnector';
const CLICKHOUSE = 'com.clickhouse.kafka.connect.ClickHouseSinkConnector';
const UNKNOWN = 'com.example.UnknownConnector';

describe('applyDefaults', () => {
  it('injects Avro converter defaults for the Postgres connector', () => {
    const result = applyDefaults({ 'connector.class': POSTGRES });
    expect(result['key.converter']).toBe('io.apicurio.registry.utils.converter.AvroConverter');
    expect(result['value.converter']).toBe('io.apicurio.registry.utils.converter.AvroConverter');
    expect(result['key.converter.apicurio.registry.auto-register']).toBe('true');
    expect(result['value.converter.apicurio.registry.auto-register']).toBe('true');
  });

  it('injects Avro converter and unwrap transform for the ClickHouse connector', () => {
    const result = applyDefaults({ 'connector.class': CLICKHOUSE });
    expect(result['key.converter']).toBe('io.apicurio.registry.utils.converter.AvroConverter');
    expect(result['transforms']).toBe('unwrap');
    expect(result['transforms.unwrap.type']).toBe('io.debezium.transforms.ExtractNewRecordState');
    expect(result['transforms.unwrap.delete.handling.mode']).toBe('rewrite');
  });

  it('preserves user-supplied values over defaults', () => {
    const result = applyDefaults({
      'connector.class': POSTGRES,
      'key.converter': 'org.apache.kafka.connect.json.JsonConverter',
    });
    expect(result['key.converter']).toBe('org.apache.kafka.connect.json.JsonConverter');
  });

  it('keeps all user-supplied keys not present in defaults', () => {
    const result = applyDefaults({
      'connector.class': POSTGRES,
      'database.hostname': 'pg-host',
      'database.port': '5432',
    });
    expect(result['database.hostname']).toBe('pg-host');
    expect(result['database.port']).toBe('5432');
  });

  it('applies no defaults for an unknown connector class', () => {
    const config = { 'connector.class': UNKNOWN, 'some.key': 'value' };
    expect(applyDefaults(config)).toEqual(config);
  });

  it('throws when connector.class is absent', () => {
    expect(() => applyDefaults({ 'some.key': 'value' })).toThrow('connector.class is required');
  });

  it('throws when connector.class is an empty string', () => {
    expect(() => applyDefaults({ 'connector.class': '' })).toThrow('connector.class is required');
  });
});

describe('getAutofilledKeys', () => {
  it('returns exactly the keys defined for the Postgres connector', () => {
    expect(getAutofilledKeys(POSTGRES)).toEqual(Object.keys(CONNECTOR_DEFAULTS[POSTGRES]!));
  });

  it('returns exactly the keys defined for the ClickHouse connector', () => {
    expect(getAutofilledKeys(CLICKHOUSE)).toEqual(Object.keys(CONNECTOR_DEFAULTS[CLICKHOUSE]!));
  });

  it('includes transform keys for ClickHouse but not for Postgres', () => {
    expect(getAutofilledKeys(CLICKHOUSE)).toContain('transforms');
    expect(getAutofilledKeys(POSTGRES)).not.toContain('transforms');
  });

  it('returns an empty array for an unknown connector class', () => {
    expect(getAutofilledKeys(UNKNOWN)).toEqual([]);
  });
});