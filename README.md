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

### Add the connector for products
```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fulfillment-products-sink-clickhouse",
    "config": {
      "connector.class": "com.clickhouse.kafka.connect.ClickHouseSinkConnector",
      "tasks.max": "1",
      "topics": "fulfillment.public.products",
      "hostname": "clickhouse",
      "port": "8123",
      "ssl": "false",
      "database": "clickhouseconsumer",
      "username": "clickhouseconsumer",
      "password": "clickhouseconsumer123",
      "exactlyOnce": "false",
      "schema.evolution": "none",
      "topic2TableMap": "fulfillment.public.products=fulfillment_products",
      "key.converter": "io.apicurio.registry.utils.converter.AvroConverter",
      "key.converter.apicurio.registry.url": "http://apicurio:8080/apis/registry/v2",
      "value.converter": "io.apicurio.registry.utils.converter.AvroConverter",
      "value.converter.apicurio.registry.url": "http://apicurio:8080/apis/registry/v2",
      "transforms": "unwrap",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.delete.handling.mode": "rewrite",
      "transforms.unwrap.add.fields": "op,source.ts_ms:source_ts_ms"
    }
  }'
```

### Add the connector for orders
```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fulfillment-orders-sink-clickhouse",
    "config": {
      "connector.class": "com.clickhouse.kafka.connect.ClickHouseSinkConnector",
      "tasks.max": "1",
      "topics": "fulfillment.public.orders",
      "hostname": "clickhouse",
      "port": "8123",
      "ssl": "false",
      "database": "clickhouseconsumer",
      "username": "clickhouseconsumer",
      "password": "clickhouseconsumer123",
      "exactlyOnce": "false",
      "schema.evolution": "none",
      "topic2TableMap": "fulfillment.public.products=fulfillment_orders",
      "key.converter": "io.apicurio.registry.utils.converter.AvroConverter",
      "key.converter.apicurio.registry.url": "http://apicurio:8080/apis/registry/v2",
      "value.converter": "io.apicurio.registry.utils.converter.AvroConverter",
      "value.converter.apicurio.registry.url": "http://apicurio:8080/apis/registry/v2",
      "transforms": "unwrap",
      "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
      "transforms.unwrap.delete.handling.mode": "rewrite",
      "transforms.unwrap.add.fields": "op,source.ts_ms:source_ts_ms"
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

### Create table for products
```sql
CREATE TABLE IF NOT EXISTS clickhouseconsumer.fulfillment_products
(
    id Int32,
    sku String,
    quantity_on_hand Int32,
    __op LowCardinality(String),
    __source_ts_ms Int64,
    __deleted Nullable(String)
)
    ENGINE = ReplacingMergeTree(__source_ts_ms)
ORDER BY id;

```
### Create table for orders

```sql
CREATE TABLE clickhouseconsumer.fulfillment_orders
(
    id Int32,
    product_id Int32,
    quantity Int32,
    __op LowCardinality(String),
    __source_ts_ms Int64,
    __deleted Nullable(String)
)
    ENGINE = ReplacingMergeTree(__source_ts_ms)
ORDER BY id;
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