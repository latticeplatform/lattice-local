import { describe, it, expect } from 'vitest';
import {
  isFieldHidden,
  UNIVERSAL_HIDDEN,
  UNIVERSAL_HIDDEN_PREFIXES,
  PLUGIN_HIDDEN,
} from '../utils';

const POSTGRES = 'io.debezium.connector.postgresql.PostgresConnector';
const MYSQL = 'io.debezium.connector.mysql.MySqlConnector';
const CLICKHOUSE = 'com.clickhouse.kafka.connect.ClickHouseSinkConnector';
const JDBC_SINK = 'io.debezium.connector.jdbc.JdbcSinkConnector';
const MIRROR_SRC = 'org.apache.kafka.connect.mirror.MirrorSourceConnector';
const UNKNOWN = 'com.example.UnknownConnector';

describe('isFieldHidden', () => {
  describe('universal hidden fields', () => {
    it('hides every field in UNIVERSAL_HIDDEN for all connectors', () => {
      for (const field of UNIVERSAL_HIDDEN) {
        expect(isFieldHidden(POSTGRES, field), `${field} should be hidden`).toBe(true);
        expect(isFieldHidden(CLICKHOUSE, field), `${field} should be hidden`).toBe(true);
        expect(
          isFieldHidden(UNKNOWN, field),
          `${field} should be hidden for unknown connector`
        ).toBe(true);
      }
    });

    it('hides converter fields universally', () => {
      expect(isFieldHidden(POSTGRES, 'key.converter')).toBe(true);
      expect(isFieldHidden(POSTGRES, 'value.converter')).toBe(true);
      expect(isFieldHidden(CLICKHOUSE, 'key.converter')).toBe(true);
    });
  });

  describe('universal hidden prefixes', () => {
    it('hides all sasl.* fields for every connector', () => {
      for (const prefix of UNIVERSAL_HIDDEN_PREFIXES) {
        const field = `${prefix}some.field`;
        expect(isFieldHidden(POSTGRES, field), `${field} should be hidden`).toBe(true);
        expect(isFieldHidden(UNKNOWN, field), `${field} should be hidden for unknown`).toBe(true);
      }
    });

    it('hides sasl.mechanism, ssl.keystore.location, openlineage.integration.enabled', () => {
      expect(isFieldHidden(POSTGRES, 'sasl.mechanism')).toBe(true);
      expect(isFieldHidden(CLICKHOUSE, 'ssl.keystore.location')).toBe(true);
      expect(isFieldHidden(MYSQL, 'openlineage.integration.enabled')).toBe(true);
    });

    it('does not hide fields that merely contain a prefix substring', () => {
      // "database.ssl.mode" starts with "database.", not "ssl." — should not be hidden universally
      expect(isFieldHidden(UNKNOWN, 'database.ssl.mode')).toBe(false);
    });
  });

  describe('plugin-specific hidden fields', () => {
    it('hides Postgres-specific fields', () => {
      expect(isFieldHidden(POSTGRES, 'plugin.name')).toBe(true);
      expect(isFieldHidden(POSTGRES, 'snapshot.mode')).toBe(true);
      expect(isFieldHidden(POSTGRES, 'slot.name')).toBe(true);
      expect(isFieldHidden(POSTGRES, 'publication.name')).toBe(true);
      expect(isFieldHidden(POSTGRES, 'schema.history.internal')).toBe(true);
    });

    it('does not hide Postgres-specific fields for other connectors', () => {
      expect(isFieldHidden(MYSQL, 'plugin.name')).toBe(false);
      expect(isFieldHidden(CLICKHOUSE, 'slot.name')).toBe(false);
    });

    it('hides ClickHouse-specific noise fields', () => {
      expect(isFieldHidden(CLICKHOUSE, 'deduplication.period.seconds')).toBe(true);
      expect(isFieldHidden(CLICKHOUSE, 'exactly.once.support.interval.ms')).toBe(true);
    });

    it('hides JDBC sink pool fields', () => {
      expect(isFieldHidden(JDBC_SINK, 'connection.pool.min.size')).toBe(true);
      expect(isFieldHidden(JDBC_SINK, 'connection.pool.max.size')).toBe(true);
      expect(isFieldHidden(JDBC_SINK, 'flush.enabled')).toBe(true);
    });

    it('hides Mirror connector replication policy internals', () => {
      expect(isFieldHidden(MIRROR_SRC, 'replication.policy.class')).toBe(true);
      expect(isFieldHidden(MIRROR_SRC, 'forwarding.admin.class')).toBe(true);
      expect(isFieldHidden(MIRROR_SRC, 'config.properties.exclude')).toBe(true);
    });
  });

  describe('Debezium common hidden fields', () => {
    const DEBEZIUM_CONNECTORS = [
      POSTGRES,
      MYSQL,
      'io.debezium.connector.mariadb.MariaDbConnector',
      'io.debezium.connector.sqlserver.SqlServerConnector',
      'io.debezium.connector.oracle.OracleConnector',
    ];

    it('hides Debezium pipeline internals for all Debezium sources', () => {
      for (const cls of DEBEZIUM_CONNECTORS) {
        expect(isFieldHidden(cls, 'retriable.restart.connector.wait.ms'), cls).toBe(true);
        expect(isFieldHidden(cls, 'executor.shutdown.timeout.ms'), cls).toBe(true);
        expect(isFieldHidden(cls, 'custom.sanitize.pattern'), cls).toBe(true);
        expect(isFieldHidden(cls, 'guardrail.collections.max'), cls).toBe(true);
        expect(isFieldHidden(cls, 'provide.transaction.metadata'), cls).toBe(true);
      }
    });
  });

  describe('visible user-facing fields', () => {
    it('does not hide core connection fields', () => {
      expect(isFieldHidden(POSTGRES, 'database.hostname')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'database.user')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'database.password')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'database.port')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'database.dbname')).toBe(false);
    });

    it('does not hide topic and table selectors', () => {
      expect(isFieldHidden(POSTGRES, 'topic.prefix')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'table.include.list')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'schema.include.list')).toBe(false);
    });

    it('does not hide sink topic selector', () => {
      expect(isFieldHidden(CLICKHOUSE, 'topics')).toBe(false);
      expect(isFieldHidden(JDBC_SINK, 'topics')).toBe(false);
    });

    it('does not hide name and tasks.max', () => {
      expect(isFieldHidden(POSTGRES, 'name')).toBe(false);
      expect(isFieldHidden(POSTGRES, 'tasks.max')).toBe(false);
    });

    it('returns false for all fields of an unknown connector class', () => {
      expect(isFieldHidden(UNKNOWN, 'database.hostname')).toBe(false);
      expect(isFieldHidden(UNKNOWN, 'some.random.field')).toBe(false);
    });
  });

  describe('PLUGIN_HIDDEN completeness', () => {
    it('has no duplicate entries within any plugin hidden list', () => {
      for (const [cls, fields] of Object.entries(PLUGIN_HIDDEN)) {
        const seen = new Set<string>();
        for (const f of fields) {
          expect(seen.has(f), `Duplicate "${f}" in ${cls}`).toBe(false);
          seen.add(f);
        }
      }
    });
  });
});
