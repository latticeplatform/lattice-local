import { config } from '../config.js';

// Opinionated per-class defaults injected by the backend before forwarding to Kafka Connect.
// These fields are also stripped from the config-definition and validate responses
// so the frontend never sees or needs to fill them in.

const apicurioUrl = config.apicurioRegistry.url;

const APICURIO_CONVERTERS = {
  'key.converter': 'io.apicurio.registry.utils.converter.AvroConverter',
  'key.converter.apicurio.registry.url': apicurioUrl,
  'key.converter.apicurio.registry.auto-register': 'true',
  'value.converter': 'io.apicurio.registry.utils.converter.AvroConverter',
  'value.converter.apicurio.registry.url': apicurioUrl,
  'value.converter.apicurio.registry.auto-register': 'true',
};

const TOPIC_CREATION_DEFAULTS = {
  'topic.creation.default.replication.factor': '-1',
  'topic.creation.default.partitions': '-1',
};

export const CONNECTOR_DEFAULTS: Record<string, Record<string, string>> = {
  // ── Debezium Sources ────────────────────────────────────────────────────
  // All sources use Apicurio Avro converters so topics carry registered schemas.

  'io.debezium.connector.postgresql.PostgresConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
    'plugin.name': 'pgoutput',
    'snapshot.mode': 'when_needed',
    'snapshot.locking.mode': 'none',
  },

  'io.debezium.connector.mysql.MySqlConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.mariadb.MariaDbConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.sqlserver.SqlServerConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.oracle.OracleConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
    'database.connection.adapter': 'LogMiner',
    'log.mining.strategy': 'online_catalog',
    'snapshot.locking.mode': 'none',
  },

  'io.debezium.connector.db2.Db2Connector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.informix.InformixConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.mongodb.MongoDbConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.db2as400.As400RpcConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.cockroachdb.CockroachDBConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.vitess.VitessConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  'io.debezium.connector.spanner.SpannerConnector': {
    ...APICURIO_CONVERTERS,
    ...TOPIC_CREATION_DEFAULTS,
  },

  // ── Sinks ───────────────────────────────────────────────────────────────
  // Sinks need Apicurio to deserialize the Avro messages written by Debezium sources.

  'com.clickhouse.kafka.connect.ClickHouseSinkConnector': {
    ...APICURIO_CONVERTERS,
    transforms: 'unwrap',
    'transforms.unwrap.type': 'io.debezium.transforms.ExtractNewRecordState',
    'transforms.unwrap.delete.handling.mode': 'rewrite',
    'transforms.unwrap.add.fields': 'op,source.ts_ms:source_ts_ms',
    'transforms.unwrap.add.fields.prefix': '',
    exactlyOnce: 'false',
    ssl: 'false',
    'tasks.max': '1',
  },

  'io.debezium.connector.jdbc.JdbcSinkConnector': {
    ...APICURIO_CONVERTERS,
  },

  'io.debezium.connector.mongodb.MongoDbSinkConnector': {
    ...APICURIO_CONVERTERS,
  },

  // ── Mirror connectors ───────────────────────────────────────────────────
  // Mirrors are source connectors writing to a target cluster, so topic creation applies.

  'org.apache.kafka.connect.mirror.MirrorSourceConnector': {
    ...TOPIC_CREATION_DEFAULTS,
    'target.cluster.alias': 'target',
  },

  'org.apache.kafka.connect.mirror.MirrorCheckpointConnector': {
    ...TOPIC_CREATION_DEFAULTS,
    'target.cluster.alias': 'target',
  },

  'org.apache.kafka.connect.mirror.MirrorHeartbeatConnector': {
    ...TOPIC_CREATION_DEFAULTS,
    'target.cluster.alias': 'target',
  },
};

/** Merges opinionated defaults into a connector config before sending to Kafka Connect. User-supplied values win. */
export function applyDefaults(config: Record<string, string>): Record<string, string> {
  if (!config['connector.class']) {
    throw new Error('connector.class is required');
  }
  const defaults = CONNECTOR_DEFAULTS[config['connector.class']] ?? {};
  return { ...defaults, ...config };
}

/** Returns the list of config keys that will be autofilled for a given connector class. */
export function getAutofilledKeys(connectorClass: string): string[] {
  return Object.keys(CONNECTOR_DEFAULTS[connectorClass] ?? {});
}
