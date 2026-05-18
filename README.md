# kafka-infrastructure

A Kafka-based CDC (Change Data Capture) pipeline using Debezium to stream PostgreSQL changes into ClickHouse.

---

## PSQL DB Schema

```mermaid
erDiagram
    PRODUCTS {
        id INT PK
        sku VARCHAR(255)
        quantity_on_hand INT
    }
    
    ORDERS {
        id INT PK
        product_id INT FK
        quantity INT
    }
    
    PRODUCTS ||--o{ ORDERS : has_many
```

---

## PostgreSQL Source Connector (Debezium)

> Replace `database.hostname` with the hostname of your Postgres container if different.

### Add the connector
```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fulfillment-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "database.hostname": "postgresql",
      "database.port": "5432",
      "database.user": "inventory",
      "database.password": "inventory123",
      "database.dbname": "inventory",
      "topic.prefix": "fulfillment",
      "plugin.name": "pgoutput",
      "snapshot.mode": "when_needed"
    }
  }'
```

### Delete the connector
```bash
curl -X DELETE http://localhost:8083/connectors/fulfillment-connector
```

---

## ClickHouse Sink Connector

### Add the connector
```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fulfillment-sink-clickhouse",
    "config": {
      "connector.class": "com.clickhouse.kafka.connect.ClickHouseSinkConnector",
      "tasks.max": "1",
      "topics": "fulfillment.public.orders",
      "hostname": "clickhouse",
      "port": "8123",
      "database": "clickhouseconsumer",
      "username": "clickhouseconsumer",
      "password": "clickhouseconsumer123",
      "schema.evolution": "alter",
      "exactlyOnce": "false",
      "value.converter": "org.apache.kafka.connect.json.JsonConverter",
      "value.converter.schemas.enable": "false",
      "schemas.enable": "false",
      "transforms": "extractPayload",
      "transforms.extractPayload.type": "org.apache.kafka.connect.transforms.ExtractField$Value",
      "transforms.extractPayload.field": "payload"
    }
  }'
```

### Delete the connector
```bash
curl -X DELETE http://localhost:8083/connectors/fulfillment-sink-clickhouse
```

---

## ClickHouse Setup

### Open a ClickHouse shell
```bash
docker exec -it clickhouse clickhouse-client \
  --user clickhouseconsumer \
  --password clickhouseconsumer123 \
  --database clickhouseconsumer
```

### Create tables

```sql
CREATE TABLE IF NOT EXISTS `fulfillment.public.products` (
                                                             before      Nullable(JSON),
    after       Nullable(JSON),
    source      JSON,
    op          String,
    ts_ms       Nullable(Int64),
    ts_us       Nullable(Int64),
    ts_ns       Nullable(Int64),
    transaction Nullable(JSON)
    )
    ENGINE = MergeTree
    ORDER BY tuple();
```

```sql
CREATE TABLE IF NOT EXISTS `fulfillment.public.orders` (
                                                           before      Nullable(String),
    after       Nullable(String),
    source      Nullable(String),
    transaction Nullable(String),
    op          Nullable(String),
    ts_ms       Nullable(Int64),
    ts_us       Nullable(Int64),
    ts_ns       Nullable(Int64)
    )
    ENGINE = MergeTree
    ORDER BY tuple();
```

---

## Kafka Topics

> Run these from any broker container.

### List all topics
```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server broker-1:19092 --list
```

### Stream a topic

Topic format: `fulfillment.public.{tablename}`  
Add `--from-beginning` to replay the full history.

```bash
/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker-1:19092 \
  --topic fulfillment.public.products
```

---

## PostgreSQL

### Open a connection
```bash
psql "postgresql://inventory:inventory123@localhost:5432/inventory"
```

### Example queries
```sql
INSERT INTO products (sku, quantity_on_hand) VALUES ('test-sku', 100000);
```
```sql
INSERT INTO orders VALUES (1, 1);
```

### One-liner from host
```bash
psql "postgresql://inventory:inventory123@localhost:5432/inventory" \
  -c "INSERT INTO products (sku, quantity_on_hand) VALUES ('sink-test-4', 999);"
```

---

## Verifying the Setup

### Check that plugins are loaded
```bash
curl -s http://localhost:8083/connector-plugins | jq '.[].class'
```

### Check that topics are created
> Run from any broker container
```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server broker-1:19092 --list
```

### Check that connectors are running
```bash
# List all active connectors
curl http://localhost:8083/connectors

# Check the status of a specific connector
curl http://localhost:8083/connectors/fulfillment-connector/status | jq
```

---

## Useful API Endpoints

| Endpoint | Description |
|---|---|
| `http://localhost:8083/connectors` | List / manage connectors |
| `http://localhost:8083/connector-plugins` | List available plugins |
| `http://localhost:8083/connector-plugins/{plugin-name}/config` | Plugin config schema |