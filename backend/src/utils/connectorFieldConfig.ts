/**
 * Connector field visibility configuration.
 *
 * Derived from querying /connector-plugins/<class>/config for all 18 installed plugins.
 *
 * Fields listed here are stripped from the config-definitions and validate responses
 * before they reach the frontend. The backend either injects a value via connectorDefaults.ts
 * or lets Kafka Connect apply its own default — the frontend never needs to see them.
 */

// ---------------------------------------------------------------------------
// Universal hidden — stripped from every connector's definition response
// ---------------------------------------------------------------------------

/** Exact field names hidden for all connectors. */
export const UNIVERSAL_HIDDEN: string[] = [
  // Converters — injected by backend via CONNECTOR_DEFAULTS
  'key.converter',
  'key.converter.plugin.version',
  'value.converter',
  'value.converter.plugin.version',
  'header.converter',
  'header.converter.plugin.version',

  // Kafka Connect framework internals
  'connector.plugin.version',
  'config.action.reload',
  'tasks.max.enforce',
  'transforms',
  'predicates',

  // Error-handling (framework defaults are fine; expose only if needed)
  'errors.tolerance',
  'errors.retry.timeout',
  'errors.retry.delay.max.ms',
  'errors.log.enable',
  'errors.log.include.messages',

  // Source framework internals
  'topic.creation.groups',
  'exactly.once.support',
  'transaction.boundary',
  'transaction.boundary.interval.ms',
  'offsets.storage.topic',

  // Redundant with UI topic selection
  'topics.regex'
];

/** Field name prefixes hidden for all connectors (catches all sub-fields automatically). */
export const UNIVERSAL_HIDDEN_PREFIXES: string[] = ['sasl.', 'ssl.', 'openlineage.'];

// ---------------------------------------------------------------------------
// Debezium-common hidden — shared by all 12 Debezium source connectors
// ---------------------------------------------------------------------------

export const DEBEZIUM_COMMON_HIDDEN: string[] = [
  // Pipeline internals
  'retriable.restart.connector.wait.ms',
  'errors.max.retries',
  'executor.shutdown.timeout.ms',
  'connection.validation.timeout.ms',
  'internal.log.position.check.enable',
  'internal.advanced.metrics.enable',
  'internal.snapshot.scan.all.columns.force',

  // Schema / naming internals
  'schema.name.adjustment.mode',
  'topic.naming.strategy',
  'transaction.metadata.factory',
  'sourceinfo.struct.maker',
  'custom.sanitize.pattern',
  'post.processors',
  'converters',

  // Snapshot internals
  'snapshot.tables.order.by.row.count',
  'snapshot.mode.custom.name',
  'snapshot.mode.configuration.based.snapshot.data',
  'snapshot.mode.configuration.based.snapshot.schema',
  'snapshot.mode.configuration.based.start.stream',
  'snapshot.mode.configuration.based.snapshot.on.schema.error',
  'snapshot.mode.configuration.based.snapshot.on.data.error',

  // Heartbeat internals
  'heartbeat.topics.prefix',
  'heartbeat.action.query',

  // Signal / notification internals
  'signal.poll.interval.ms',
  'signal.enabled.channels',
  'notification.enabled.channels',

  // Incremental snapshot internals
  'incremental.snapshot.watermarking.strategy',
  'incremental.snapshot.allow.schema.changes',

  // Guardrails
  'guardrail.collections.max',
  'guardrail.collections.limit.action',

  // Metrics / telemetry
  'custom.metric.tags',
  'extended.headers.enabled',
  'provide.transaction.metadata',

  // Misc low-value
  'table.ignore.builtin',
  'streaming.delay.ms',
];

// ---------------------------------------------------------------------------
// Per-plugin hidden fields
// ---------------------------------------------------------------------------

export const PLUGIN_HIDDEN: Record<string, string[]> = {
  // ── Sinks ──────────────────────────────────────────────────────────────

  'com.clickhouse.kafka.connect.ClickHouseSinkConnector': [
    // Injected via CONNECTOR_DEFAULTS
    'transforms.unwrap.type',
    'transforms.unwrap.delete.handling.mode',
    'transforms.unwrap.add.fields',
    // ClickHouse-specific noise
    'ssl',
    'sslmode',
    'sslrootcert',
    'jdbcConnectionProperties',
    'exactly.once.support.interval.ms',
    'client.retry.on.failure',
    'topic.prefix',
    'deduplication.period.seconds',
  ],

  'io.debezium.connector.jdbc.JdbcSinkConnector': [
    'connection.pool.min.size',
    'connection.pool.max.size',
    'connection.pool.acquire.increment',
    'connection.pool.timeout',
    'quote.identifiers',
    'field.include.list',
    'field.exclude.list',
    'schema.evolution',
    'delete.handling.mode',
    'flush.enabled',
    'flush.size',
  ],

  'io.debezium.connector.mongodb.MongoDbSinkConnector': [
    'mongodb.write.concern',
    'mongodb.max.batch.size',
    'mongodb.bulk.write.ordered',
    'timeseries.timefield',
    'timeseries.metafield',
    'timeseries.granularity',
    'change.data.capture.handler',
    'post.processors',
    'field.renamer.mapping',
    'field.renamer.regexp',
  ],

  // ── Debezium Sources ───────────────────────────────────────────────────

  'io.debezium.connector.postgresql.PostgresConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    // Injected by backend
    'plugin.name',
    'snapshot.mode',
    'snapshot.locking.mode',
    // Replication slot internals
    'slot.name',
    'slot.stream.params',
    'slot.max.retries',
    'slot.retry.delay.ms',
    'slot.drop.on.stop',
    // Schema history internals
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    // Publication internals
    'publication.autocreate.mode',
    'publication.name',
    'flush.lsn.source',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.mysql.MySqlConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'binlog.buffer.size',
    'gtid.source.excludes',
    'gtid.source.filter.dml.events',
    'min.row.count.to.stream.results',
    'query.fetch.size',
    'database.initial.statements',
    'jdbc.driver',
    'database.ssl.mode',
    'database.ssl.keystore',
    'database.ssl.keystore.password',
    'database.ssl.truststore',
    'database.ssl.truststore.password',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.mariadb.MariaDbConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'binlog.buffer.size',
    'gtid.source.excludes',
    'gtid.source.filter.dml.events',
    'min.row.count.to.stream.results',
    'query.fetch.size',
    'database.initial.statements',
    'jdbc.driver',
    'database.ssl.mode',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.sqlserver.SqlServerConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'database.instance',
    'database.encrypt',
    'database.trustServerCertificate',
    'database.initial.statements',
    'database.ssl.truststore',
    'database.ssl.truststore.password',
    'query.fetch.size',
    'max.lsn.optimization',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.mongodb.MongoDbConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'mongodb.members.auto.discover',
    'mongodb.auth.source',
    'mongodb.ssl.enabled',
    'mongodb.ssl.invalid.hostname.allowed',
    'mongodb.connection.mode',
    'capture.mode',
    'capture.scope',
    'cursor.max.await.time.ms',
    'cursor.pipeline.order',
    'cursor.pipeline',
    'field.exclude.list',
    'field.renames',
  ],

  'io.debezium.connector.db2.Db2Connector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'database.ssl.connection',
    'database.initial.statements',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.oracle.OracleConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'database.tablespace',
    'database.outserver.name',
    'log.mining.continuous.mine',
    'log.mining.archive.log.hours',
    'log.mining.batch.size.default',
    'log.mining.batch.size.min',
    'log.mining.batch.size.max',
    'log.mining.sleep.time.default.ms',
    'log.mining.sleep.time.min.ms',
    'log.mining.sleep.time.max.ms',
    'log.mining.sleep.time.increment.ms',
    'log.mining.transaction.retention.hours',
    'log.mining.archive.destination.name',
    'log.mining.username',
    'log.mining.buffer.type',
    'log.mining.buffer.infinispan.cache.global',
    'log.mining.buffer.infinispan.cache.transactions',
    'log.mining.buffer.infinispan.cache.events',
    'log.mining.buffer.infinispan.cache.processed.transactions',
    'log.mining.buffer.location',
    'log.mining.session.max.ms',
    'log.mining.scn.gap.detection.gap.size.min',
    'log.mining.scn.gap.detection.time.limit.max.ms',
    'log.mining.query.filter.mode',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.informix.InformixConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'schema.history.internal',
    'schema.history.internal.skip.unparseable.ddl',
    'schema.history.internal.store.only.captured.tables.ddl',
    'schema.history.internal.store.only.captured.databases.ddl',
    'database.initial.statements',
    'unavailable.value.placeholder',
  ],

  'io.debezium.connector.db2as400.As400RpcConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'database.library.list',
  ],

  'io.debezium.connector.cockroachdb.CockroachDBConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    // CockroachDB uses its own changefeed mechanism — these are internal sink wiring
    'cockroachdb.changefeed.sink.type',
    'cockroachdb.changefeed.sink.uri',
    'cockroachdb.changefeed.envelope',
    'schema.history.internal',
  ],

  'io.debezium.connector.vitess.VitessConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'vitess.tablet.type',
    'vitess.stop_on_reshard',
    'vitess.grpc.timeout.ms',
    'vitess.grpc.max.inbound.message.size',
  ],

  'io.debezium.connector.spanner.SpannerConnector': [
    ...DEBEZIUM_COMMON_HIDDEN,
    'gcp.spanner.credentials.file',
    'gcp.spanner.credentials.json',
    'gcp.spanner.low.watermark.enabled',
    'gcp.spanner.low.watermark.stamp.interval.ms',
    'gcp.spanner.heartbeat.interval.ms',
    'gcp.spanner.heartbeat.statement',
    'gcp.spanner.start.time',
    'gcp.spanner.end.time',
  ],

  // ── Mirror connectors ──────────────────────────────────────────────────

  'org.apache.kafka.connect.mirror.MirrorSourceConnector': [
    'config.properties.exclude',
    'offset.syncs.topic.location',
    'consumer.poll.timeout.ms',
    'sync.topic.acls.enabled',
    'sync.topic.acls.interval.seconds',
    'sync.topic.configs.enabled',
    'sync.topic.configs.interval.seconds',
    'refresh.topics.enabled',
    'refresh.topics.interval.seconds',
    'metric.reporters',
    'replication.factor',
    'replication.policy.class',
    'replication.policy.separator',
    'replication.policy.internal.topic.separator.enabled',
    'forwarding.admin.class',
  ],

  'org.apache.kafka.connect.mirror.MirrorCheckpointConnector': [
    'emit.checkpoints.enabled',
    'emit.checkpoints.interval.seconds',
    'refresh.groups.enabled',
    'refresh.groups.interval.seconds',
    'sync.group.offsets.enabled',
    'sync.group.offsets.interval.seconds',
    'checkpoints.topic.replication.factor',
    'metric.reporters',
    'replication.policy.class',
    'replication.policy.separator',
    'replication.policy.internal.topic.separator.enabled',
    'forwarding.admin.class',
  ],

  'org.apache.kafka.connect.mirror.MirrorHeartbeatConnector': [
    'emit.heartbeats.enabled',
    'emit.heartbeats.interval.seconds',
    'heartbeats.topic.replication.factor',
    'metric.reporters',
    'replication.policy.class',
    'replication.policy.separator',
    'replication.policy.internal.topic.separator.enabled',
    'forwarding.admin.class',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if a field should be hidden from the frontend for a given connector class. */
export function isFieldHidden(connectorClass: string, fieldName: string): boolean {
  if (UNIVERSAL_HIDDEN_PREFIXES.some((p) => fieldName.startsWith(p))) return true;
  if (UNIVERSAL_HIDDEN.includes(fieldName)) return true;
  return (PLUGIN_HIDDEN[connectorClass] ?? []).includes(fieldName);
}
