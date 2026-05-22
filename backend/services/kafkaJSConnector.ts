import { type Admin, type Consumer, type ConsumerConfig, Kafka, type KafkaConfig, type Producer } from "kafkajs";

const kafkaConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID ?? "kafka-infrastructure-backend",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
};

const kafka = new Kafka(kafkaConfig);

// Lazy singletons — connect once, reuse across requests
let _admin: Admin | undefined;
let _producer: Producer | undefined;

export const getAdmin = async (): Promise<Admin> => {
  if (!_admin) {
    _admin = kafka.admin();
    await _admin.connect();
  }
  return _admin;
}

export const getProducer = async (): Promise<Producer> => {
  if (!_producer) {
    _producer = kafka.producer();
    await _producer.connect();
  }
  return _producer;
}

export const createNewConsumer = (config:ConsumerConfig): Consumer => {
  return kafka.consumer(config);
}