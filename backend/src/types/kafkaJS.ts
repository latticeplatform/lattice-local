import type { Consumer, ITopicMetadata, RecordMetadata } from 'kafkajs';

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

// Discriminated union for peekTopicSchema
export type SchemaResult =
  | { source: 'apicurio'; schemaId: number; schemaType: string; schema: unknown }
  | { source: 'debezium-json'; schema: unknown };

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
}

export interface KafkaTopicMessageWithValue {
  value: Buffer;
}
