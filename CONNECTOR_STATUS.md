# Connector Status

## Sources (CDC)

| Rank | Connector      | Class                                                    | Status      |
|------|----------------|----------------------------------------------------------|-------------|
| 1    | PostgreSQL     | `io.debezium.connector.postgresql.PostgresConnector`     | **working** |
| 2    | MySQL          | `io.debezium.connector.mysql.MySqlConnector`             | untested    |
| 3    | SQL Server     | `io.debezium.connector.sqlserver.SqlServerConnector`     | untested    |
| 4    | MongoDB        | `io.debezium.connector.mongodb.MongoDbConnector`         | untested    |
| 5    | Oracle         | `io.debezium.connector.oracle.OracleConnector`           | untested    |
| 6    | MariaDB        | `io.debezium.connector.mariadb.MariaDbConnector`         | untested    |
| 7    | CockroachDB    | `io.debezium.connector.cockroachdb.CockroachDBConnector` | untested    |
| 8    | DB2            | `io.debezium.connector.db2.Db2Connector`                 | untested    |
| 9    | Vitess         | `io.debezium.connector.vitess.VitessConnector`           | untested    |
| 10   | Informix       | `io.debezium.connector.informix.InformixConnector`       | untested    |
| 11   | Google Spanner | `io.debezium.connector.spanner.SpannerConnector`         | untested    |
| 12   | DB2/AS400      | `io.debezium.connector.db2as400.As400RpcConnector`       | untested    |

## Sinks

| Rank | Connector  | Class                                                  | Status      |
|------|------------|--------------------------------------------------------|-------------|
| 1    | JDBC       | `io.debezium.connector.jdbc.JdbcSinkConnector`         | untested    |
| 2    | MongoDB    | `io.debezium.connector.mongodb.MongoDbSinkConnector`   | **working** |
| 3    | ClickHouse | `com.clickhouse.kafka.connect.ClickHouseSinkConnector` | **working** |

## MirrorMaker2

| Rank | Connector        | Class                                                       | Status   |
|------|------------------|-------------------------------------------------------------|----------|
| 1    | MirrorSource     | `org.apache.kafka.connect.mirror.MirrorSourceConnector`     | untested |
| 2    | MirrorCheckpoint | `org.apache.kafka.connect.mirror.MirrorCheckpointConnector` | untested |
| 3    | MirrorHeartbeat  | `org.apache.kafka.connect.mirror.MirrorHeartbeatConnector`  | untested |