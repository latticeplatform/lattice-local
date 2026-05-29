import type { KCConfigInfos } from '../types/index.js';

// Fields that the Kafka Connect validation API does NOT flag as required on an empty config
// but that are known to cause runtime failures without them. This supplements markPasswordsRequired.

export const PLUGIN_REQUIRED: Record<string, string[]> = {
  // ── Sinks ──────────────────────────────────────────────────────────────────

  'io.debezium.connector.mongodb.MongoDbSinkConnector': [
    // DefaultMongoNamespaceMapper derives the db name from the topic, but only works if
    // the topic name contains a dot. Explicitly required to avoid "databaseName can not be null".
    'sink.database',
    'topics',
    'mongodb.connection.string',
  ],

  'io.debezium.connector.jdbc.JdbcSinkConnector': ['connection.url'],

  'com.clickhouse.kafka.connect.ClickHouseSinkConnector': [
    'hostname',
    'port',
    'database',
    'username',
    'password',
    'topics',
  ],

  // ── Debezium Sources ────────────────────────────────────────────────────────

  'io.debezium.connector.postgresql.PostgresConnector': [
    'database.hostname',
    'database.dbname',
    'database.password',
    'database.user',
    'topic.prefix',
  ],

  'io.debezium.connector.mysql.MySqlConnector': [
    'database.hostname',
    'database.server.id',
    'topic.prefix',
  ],

  'io.debezium.connector.mariadb.MariaDbConnector': [
    'database.hostname',
    'database.server.id',
    'topic.prefix',
  ],

  'io.debezium.connector.sqlserver.SqlServerConnector': [
    'database.hostname',
    'database.names',
    'topic.prefix',
  ],

  'io.debezium.connector.mongodb.MongoDbConnector': ['mongodb.connection.string', 'topic.prefix'],

  'io.debezium.connector.oracle.OracleConnector': [
    'database.hostname',
    'database.dbname',
    'topic.prefix',
  ],

  'io.debezium.connector.db2.Db2Connector': [
    'database.hostname',
    'database.dbname',
    'topic.prefix',
  ],

  'io.debezium.connector.informix.InformixConnector': [
    'database.hostname',
    'database.dbname',
    'topic.prefix',
  ],

  'io.debezium.connector.db2as400.As400RpcConnector': ['database.hostname', 'topic.prefix'],

  'io.debezium.connector.cockroachdb.CockroachDBConnector': [
    'database.hostname',
    'database.dbname',
    'topic.prefix',
  ],

  'io.debezium.connector.vitess.VitessConnector': ['vitess.keyspace', 'topic.prefix'],

  'io.debezium.connector.spanner.SpannerConnector': [
    'gcp.spanner.project.id',
    'gcp.spanner.instance.id',
    'gcp.spanner.database.id',
    'topic.prefix',
  ],

  // ── Mirror connectors ───────────────────────────────────────────────────────

  'org.apache.kafka.connect.mirror.MirrorSourceConnector': [
    'source.cluster.alias',
    'source.cluster.bootstrap.servers',
    'topics',
  ],

  'org.apache.kafka.connect.mirror.MirrorCheckpointConnector': [
    'source.cluster.alias',
    'source.cluster.bootstrap.servers',
  ],

  'org.apache.kafka.connect.mirror.MirrorHeartbeatConnector': [
    'source.cluster.alias',
    'source.cluster.bootstrap.servers',
  ],
};

/**
 * Marks connector-specific fields as required in a KCConfigInfos response.
 * Targets fields that Kafka Connect's own validation does not flag on empty input
 * but that are known to cause runtime failures when absent.
 */
export const markConnectorRequired = (
  pluginClass: string,
  data: KCConfigInfos,
  suppliedConfig: Record<string, string>
): void => {
  const requiredFields = PLUGIN_REQUIRED[pluginClass] ?? [];
  if (requiredFields.length === 0) return;

  for (const c of data.configs) {
    if (!c.definition) continue;
    if (!requiredFields.includes(c.definition.name)) continue;
    if (suppliedConfig[c.definition.name]) continue;

    const label = c.definition.display_name || c.definition.name;
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
