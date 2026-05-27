import type { Consumer, ITopicMetadata, KafkaMessage, RecordMetadata } from 'kafkajs';

export interface CreateTopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
}

export interface ProduceMessage {
  key?: string;
  value: string;
  partition?: number;
}

// Shape produced by getTopicOffsets
export interface PartitionOffsets {
  partition: number;
  earliest: string;
  latest: string;
  high: string;
  low: string;
}

// Mirrors the kafkajs Admin.describeCluster()
export interface BrokerInfo {
  nodeId: number;
  host: string;
  port: number;
}

export interface ClusterDescription {
  brokers: BrokerInfo[];
  controller: number | null;
  clusterId: string;
}

export interface StreamMessageEvent {
  offset: string;
  partition: number;
  key: unknown;
  timestamp: string;
  schemaId?: number;
  schema?: unknown;
  value: unknown;
}

export interface SchemaField {
  name: string;
  type: unknown;
  default?: unknown;
  doc?: string;
}

export type SchemaResult =
  | {
      source: 'apicurio';
      schemaId: number;
      schemaType: string;
      name?: string;
      namespace?: string;
      doc?: string;
      fields?: SchemaField[];
      raw: string;
    }
  | {
      source: 'debezium-json';
      name?: string;
      namespace?: string;
      doc?: string;
      fields?: SchemaField[];
      raw: string;
    };

export interface KafkaJSService {
  // Topics
  listTopics: () => Promise<string[]>;
  getTopicMetadata: (topicName: string) => Promise<ITopicMetadata | null>;
  getTopicOffsets: (topicName: string) => Promise<PartitionOffsets[]>;
  createTopics: (topics: CreateTopicConfig[]) => Promise<boolean>;
  deleteTopic: (topicName: string) => Promise<void>;

  // Cluster
  describeCluster: () => Promise<ClusterDescription>;

  // Produce
  produce: (topic: string, messages: ProduceMessage[]) => Promise<RecordMetadata[]>;

  // Schema / Stream (consumer-based)
  peekTopicSchema: (topicName: string) => Promise<SchemaResult>;
  createStreamConsumer: (topicName: string, fromBeginning: boolean) => Promise<Consumer>;
  parseStreamMessage: (partition: number, message: KafkaMessage) => Promise<StreamMessageEvent>;
}

export interface KafkaTopicMessageWithValue {
  value: Buffer;
}
