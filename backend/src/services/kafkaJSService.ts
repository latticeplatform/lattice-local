import { type Consumer, Kafka, type KafkaConfig } from 'kafkajs';
import { config } from '../config.js';
import { fetchSchema, parseValue } from '../utils/index.js';
import type { KafkaJSService, SchemaField, SchemaResult } from '../types/index.js';

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
} satisfies KafkaConfig);

const withAdmin = async <T>(
  fn: (admin: ReturnType<typeof kafka.admin>) => Promise<T>
): Promise<T> => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    return await fn(admin);
  } finally {
    await admin.disconnect();
  }
};

const withProducer = async <T>(
  fn: (producer: ReturnType<typeof kafka.producer>) => Promise<T>
): Promise<T> => {
  const producer = kafka.producer();
  await producer.connect();
  try {
    return await fn(producer);
  } finally {
    await producer.disconnect();
  }
};

const extractFields = (rawFields: Record<string, unknown>[]): SchemaField[] =>
  rawFields.map((f) => ({
    // Avro uses f.name; Debezium uses f.field (f.name is its logical type)
    name: String(f.field ?? f.name ?? ''),
    type: f.type,
    ...(typeof f.optional === 'boolean' && { optional: f.optional }),
    // Avro logicalType sits on the type object; Debezium puts it in f.name when f.field exists
    ...(typeof f.logicalType === 'string' && { logicalType: f.logicalType }),
    ...(typeof f.name === 'string' && f.field !== undefined && { logicalType: f.name }),
    ...(f.default !== undefined && { default: f.default }),
    ...(typeof f.doc === 'string' && { doc: f.doc }),
    ...(Array.isArray(f.fields) && { fields: extractFields(f.fields as Record<string, unknown>[]) }),
  }));

const extractSchemaShape = (
  rawSchema: string
): { name?: string; namespace?: string; doc?: string; fields?: SchemaField[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSchema);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null) return {};
  const rec = parsed as Record<string, unknown>;
  return {
    ...(typeof rec.name === 'string' && { name: rec.name }),
    ...(typeof rec.namespace === 'string' && { namespace: rec.namespace }),
    ...(typeof rec.doc === 'string' && { doc: rec.doc }),
    ...(Array.isArray(rec.fields) && { fields: extractFields(rec.fields as Record<string, unknown>[]) }),
  };
};

const kafkaJSService: KafkaJSService = {
  listTopics: () => withAdmin((a) => a.listTopics()),
  listTopics: () => {
    return withAdmin((a) => a.listTopics());
  },

  getTopicMetadata: (topicName: string) =>
    withAdmin((a) =>
  getTopicMetadata: (topicName: string) => {
    return withAdmin((a) =>
      a.fetchTopicMetadata({ topics: [topicName] }).then((r) => r.topics[0] ?? null)
    );
  },

  getTopicOffsets: (topicName: string) =>
    withAdmin(async (a) => {
      const [latest, earliest] = await Promise.all([
        a.fetchTopicOffsets(topicName),
        a.fetchTopicOffsetsByTimestamp(topicName, -2),
      ]);
      return latest.map((p) => ({
        partition: p.partition,
        earliest: earliest.find((e) => e.partition === p.partition)?.offset ?? '0',
        latest: p.offset,
        high: p.high,
        low: p.low,
      }));
    }),

  createTopics: (topics: { topic: string; numPartitions?: number; replicationFactor?: number }[]) =>
    withAdmin((a) =>
  createTopics: (topics: { topic: string; numPartitions?: number; replicationFactor?: number }[]) => {
    return withAdmin((a) =>
      a.createTopics({
        topics: topics.map((t) => ({
          topic: t.topic,
          numPartitions: t.numPartitions ?? 1,
          replicationFactor: t.replicationFactor ?? 1,
        })),
      })
    );
  },

  deleteTopic: (topicName: string) => withAdmin((a) => a.deleteTopics({ topics: [topicName] })),
  deleteTopic: (topicName: string) => {
    return withAdmin((a) => a.deleteTopics({ topics: [topicName] }));
  },

  describeCluster: () => withAdmin((a) => a.describeCluster()),
  describeCluster: () => {
    return withAdmin((a) => a.describeCluster());
  },

  produce: (topic: string, messages: { key?: string; value: string; partition?: number }[]) =>
    withProducer((p) => p.send({ topic, messages })),
  produce: (topic: string, messages: { key?: string; value: string; partition?: number }[]) => {
    return withProducer((p) => p.send({ topic, messages }));
  },

  peekTopicSchema: async (topicName: string): Promise<SchemaResult> => {
    const consumer = kafka.consumer({
      groupId: `__schema-peek-${topicName}-${String(Date.now())}`,
    });

    let resolveSchema!: (v: SchemaResult) => void;
    let rejectSchema!: (e: Error) => void;
    const pending = new Promise<SchemaResult>((rs, rj) => {
      resolveSchema = rs;
      rejectSchema = rj;
    });

    const timeout = setTimeout(() => {
      rejectSchema(new Error('Timed out — topic may be empty'));
    }, 10_000);

    try {
      await consumer.connect();
      await consumer.subscribe({ topic: topicName, fromBeginning: true });

      let handled = false;

      await consumer.run({
        eachMessage: async ({ message }) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeout);

          try {
            // Apicurio v2: schema ID is in the header as an 8-byte big-endian global ID
            const globalIdBuf = message.headers?.['apicurio.value.globalId'];
            if (Buffer.isBuffer(globalIdBuf) && globalIdBuf.length === 8) {
              const schemaId = Number(globalIdBuf.readBigInt64BE(0));
              const { schema: raw, schemaType } = await fetchSchema(schemaId);
              resolveSchema({
                source: 'apicurio',
                schemaId,
                schemaType,
                ...extractSchemaShape(raw),
                raw,
              });
              return;
            }

            // Fallback: Confluent wire format or Debezium JSON embedded in the value
            if (!message.value) {
              rejectSchema(new Error('Message has no value'));
              return;
            }
            const parsed = await parseValue(message.value);
            if (parsed.format === 'json' || parsed.format === 'string') {
              rejectSchema(new Error('Message has no schema (plain JSON or unencoded string)'));
              return;
            }
            const raw = JSON.stringify(parsed.schema);
            resolveSchema(
              parsed.format === 'apicurio'
                ? {
                    source: 'apicurio',
                    schemaId: parsed.schemaId,
                    schemaType: parsed.schemaType,
                    ...extractSchemaShape(raw),
                    raw,
                  }
                : { source: 'debezium-json', ...extractSchemaShape(raw), raw }
            );
          } catch (e) {
            rejectSchema(e instanceof Error ? e : new Error(String(e)));
            const err = e instanceof Error ? e : new Error(String(e));
            rejectSchema(err);
          }
        },
      });

      return await pending;
    } finally {
      clearTimeout(timeout);
      await consumer.disconnect().catch(() => {});
    }
  },

  // ---------------------------------------------------------------------------
  // STREAM CONSUMER
  // Returns a consumer already connected and subscribed. The caller owns the
  // lifecycle — call .run() to receive messages and .disconnect() to stop.
  // This is intentional: the stream lives as long as the SSE connection does.
  // ---------------------------------------------------------------------------3
  createStreamConsumer: async (topicName: string, fromBeginning: boolean): Promise<Consumer> => {
    const consumer = kafka.consumer({
      groupId: `__stream-${topicName}-${String(Date.now())}`,
    });
    await consumer.connect();
    await consumer.subscribe({ topic: topicName, fromBeginning });
    return consumer;
  },

  parseStreamMessage: async (partition, message) => {
    let value: unknown = null;
    let schema: unknown = undefined;
    let schemaId: number | undefined;

    if (message.value !== null) {
      const rawValue = message.value;
      const parsed = await parseValue(rawValue).catch(() => ({
        format: 'string' as const,
        payload: rawValue.toString('utf-8'),
      }));
      value = parsed.payload;
      if (parsed.format === 'apicurio') {
        schemaId = parsed.schemaId;
        schema = parsed.schema;
      } else if (parsed.format === 'debezium-json') {
        schema = parsed.schema;
      }
    }

    let key: unknown = null;
    if (message.key !== null) {
      const rawKey = message.key;
      const parsedKey = await parseValue(rawKey).catch(() => ({
        format: 'string' as const,
        payload: rawKey.toString('utf-8'),
      }));
      key = parsedKey.payload;
    }

    return {
      offset: message.offset,
      partition,
      key,
      timestamp: message.timestamp,
      schemaId,
      schema,
      value,
    };
  },
};

export default kafkaJSService;
