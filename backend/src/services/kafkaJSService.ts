import { type Consumer, Kafka, type KafkaConfig } from 'kafkajs';
import { config } from '../config.js';
import { isKafkaTopicMessageWithValue, parseValue } from '../utils/index.js';
import type { KafkaJSService, SchemaResult } from '../types/index.js';

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

const kafkaJSService: KafkaJSService = {
  listTopics: () => withAdmin((a) => a.listTopics()),

  getTopicMetadata: (topicName: string) =>
    withAdmin((a) =>
      a.fetchTopicMetadata({ topics: [topicName] }).then((r) => r.topics[0] ?? null)
    ),

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
      a.createTopics({
        topics: topics.map((t) => ({
          topic: t.topic,
          numPartitions: t.numPartitions ?? 1,
          replicationFactor: t.replicationFactor ?? 1,
        })),
      })
    ),

  deleteTopic: (topicName: string) => withAdmin((a) => a.deleteTopics({ topics: [topicName] })),

  describeCluster: () => withAdmin((a) => a.describeCluster()),

  produce: (topic: string, messages: { key?: string; value: string; partition?: number }[]) =>
    withProducer((p) => p.send({ topic, messages })),

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
        eachMessage: async ({ message }: { message: unknown }) => {
          if (handled) return;
          handled = true;
          clearTimeout(timeout);

          if (!isKafkaTopicMessageWithValue(message)) {
            rejectSchema(new Error('Message has no value'));
            return;
          }
          try {
            const parsed = await parseValue(message.value);
            if (parsed.format === 'json' || parsed.format === 'string') {
              rejectSchema(new Error('Message has no schema (plain JSON or unencoded string)'));
              return;
            }
            resolveSchema(
              parsed.format === 'apicurio'
                ? {
                    source: 'apicurio',
                    schemaId: parsed.schemaId,
                    schemaType: parsed.schemaType,
                    schema: parsed.schema,
                  }
                : { source: 'debezium-json', schema: parsed.schema }
            );
          } catch (e) {
            rejectSchema(e instanceof Error ? e : new Error(String(e)));
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
};

export default kafkaJSService;
