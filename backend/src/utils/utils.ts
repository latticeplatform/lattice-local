import express from 'express';
import axios from 'axios';
import avsc from 'avsc';
import type { KCConfigInfos } from '../types/index.js';

// const KAFKA_INFRA_TOPICS = [
//   '__consumer_offsets',
//   '__transaction_state',
//   'connect-offsets',
//   'connect-configs',
//   'connect-statuses'
// ];

import { config } from '../config.js';
const APICURIO_REGISTRY_URL = config.apicurioRegistry.url;
const schemaCache = new Map<number, { schema: string; schemaType: string }>();

export const kafkaError = (err: unknown, res: express.Response) => {
  console.error('KafkaJS error:', err);
  const message = err instanceof Error ? err.message : 'Kafka operation failed';
  res.status(500).json({ error: message });
};

export const fetchSchema = async (
  schemaId: number
): Promise<{ schema: string; schemaType: string }> => {
  const existingSchema = schemaCache.get(schemaId);
  if (existingSchema) return existingSchema;
  const schemaUrl = `${APICURIO_REGISTRY_URL}/schemas/ids/${String(schemaId)}`;
  console.log('Fetching schema from Confluent Schema Registry:', schemaUrl);
  const { data } = await axios.get<{ schema: string; schemaType: string }>(schemaUrl);
  schemaCache.set(schemaId, data);
  return data;
};

// Wire format: 0x00 magic byte | 4-byte big-endian schema ID | encoded payload
export const parseWireFormat = (value: Buffer): { schemaId: number; payload: Buffer } | null => {
  if (value.length < 5 || value[0] !== 0x00) return null;
  return { schemaId: value.readInt32BE(1), payload: value.subarray(5) };
};

export const decodeAvro = (schemaStr: string, payload: Buffer): Promise<unknown> => {
  return avsc.Type.forSchema(JSON.parse(schemaStr)).fromBuffer(payload);
};

// Unified message value parser — handles three formats in priority order:
//   1. Confluent/Apicurio SR wire format: 0x00 magic byte + schema ID + Avro payload
//   2. Debezium JSON envelope: { schema: {...}, payload: {...} }
//   3. Plain JSON / plain string fallback
export type ParsedValue =
  | { format: 'apicurio'; schemaId: number; schemaType: string; schema: unknown; payload: unknown }
  | { format: 'debezium-json'; schema: unknown; payload: unknown }
  | { format: 'json'; payload: unknown }
  | { format: 'string'; payload: string };

export const parseValue = async (raw: Buffer): Promise<ParsedValue> => {
  const wire = parseWireFormat(raw);
  if (wire) {
    const { schema, schemaType } = await fetchSchema(wire.schemaId);
    let payload: unknown;
    try {
      payload =
        schemaType === 'AVRO'
          ? await decodeAvro(schema, wire.payload)
          : JSON.parse(wire.payload.toString('utf-8'));
    } catch {
      payload = { _raw: wire.payload.toString('base64') };
    }
    return {
      format: 'apicurio',
      schemaId: wire.schemaId,
      schemaType,
      schema: JSON.parse(schema),
      payload,
    };
  }

  try {
    const parsed = JSON.parse(raw.toString('utf-8')) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'schema' in parsed &&
      'payload' in parsed
    ) {
      const env = parsed;
      return { format: 'debezium-json', schema: env.schema, payload: env.payload };
    }
    return { format: 'json', payload: parsed };
  } catch {
    return { format: 'string', payload: raw.toString('utf-8') };
  }
};

export const markPasswordsRequired = (
  data: KCConfigInfos,
  suppliedConfig: Record<string, string>
): void => {
  for (const c of data.configs) {
    if (c.definition.type !== 'PASSWORD') continue;
    if (c.definition.name.includes('ssl')) continue;
    if (suppliedConfig[c.definition.name]) continue;
    const label = c.definition.display_name;
    if (c.value === null) {
      c.value = {
        name: c.definition.name,
        value: null,
        errors: [`${label} is required`],
        visible: true,
        recommended_values: [],
      };
    } else if (c.value.errors.length === 0) {
      c.value.errors = [`${label} is required`];
    }
  }
};

export const extractDatabaseConnectivityInfo = () => {}