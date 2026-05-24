import express from "express";

import axios from "axios";
import avsc from "avsc";

// const KAFKA_INFRA_TOPICS = [
//   '__consumer_offsets',
//   '__transaction_state',
//   'connect-offsets',
//   'connect-configs',
//   'connect-statuses'
// ];

const SCHEMA_REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL ?? "http://localhost:8081";
const schemaCache = new Map<number, { schema: string; schemaType: string }>();

export const kafkaError = (err: unknown, res: express.Response) => {
  console.error("KafkaJS error:", err);
  const message = err instanceof Error ? err.message : "Kafka operation failed";
  res.status(500).json({ error: message });
}

export const fetchSchema =  async (schemaId: number): Promise<{ schema: string; schemaType: string }> => {
  if (schemaCache.has(schemaId)) return schemaCache.get(schemaId)!;
  // Apicurio exposes a Confluent-compatible endpoint at /apis/ccompat/v6
  const { data } = await axios.get<{ schema: string; schemaType: string }>(
    `${SCHEMA_REGISTRY_URL}/apis/ccompat/v6/schemas/ids/${schemaId}`
  );
  schemaCache.set(schemaId, data);
  return data;
}

// Wire format: 0x00 magic byte | 4-byte big-endian schema ID | encoded payload
export const parseWireFormat = (value: Buffer): { schemaId: number; payload: Buffer } | null => {
  if (value.length < 5 || value[0] !== 0x00) return null;
  return { schemaId: value.readInt32BE(1), payload: value.subarray(5) };
}

export const decodeAvro = async (schemaStr: string, payload: Buffer): Promise<unknown> => {
  return avsc.Type.forSchema(JSON.parse(schemaStr)).fromBuffer(payload);
}

// Unified message value parser — handles three formats in priority order:
//   1. Confluent/Apicurio SR wire format: 0x00 magic byte + schema ID + Avro payload
//   2. Debezium JSON envelope: { schema: {...}, payload: {...} }
//   3. Plain JSON / plain string fallback
export type ParsedValue =
  | { format: "apicurio"; schemaId: number; schemaType: string; schema: unknown; payload: unknown }
  | { format: "debezium-json"; schema: unknown; payload: unknown }
  | { format: "json"; payload: unknown }
  | { format: "string"; payload: string };

export const parseValue = async (raw: Buffer): Promise<ParsedValue> => {
  const wire = parseWireFormat(raw);
  if (wire) {
    const { schema, schemaType } = await fetchSchema(wire.schemaId);
    let payload: unknown;
    try {
      payload = schemaType === "AVRO"
        ? await decodeAvro(schema, wire.payload)
        : JSON.parse(wire.payload.toString("utf-8"));
    } catch {
      payload = { _raw: wire.payload.toString("base64") };
    }
    return { format: "apicurio", schemaId: wire.schemaId, schemaType, schema: JSON.parse(schema), payload };
  }

  try {
    const parsed = JSON.parse(raw.toString("utf-8")) as unknown;
    if (parsed !== null && typeof parsed === "object" && "schema" in parsed && "payload" in parsed) {
      const env = parsed as { schema: unknown; payload: unknown };
      return { format: "debezium-json", schema: env.schema, payload: env.payload };
    }
    return { format: "json", payload: parsed };
  } catch {
    return { format: "string", payload: raw.toString("utf-8") };
  }
}
