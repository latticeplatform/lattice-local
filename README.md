# kafka-infrastructure

# Adding the debezium pg-connector
Make sure you replace the hostname with the hostname of the postgres container.
```bash
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{ 
  "name": "fulfillment-connector",
  "config": {
    "plugin.name": "pgoutput",
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": <hostname>, 
    "database.port": "5432",
    "database.user": "inventory",
    "database.password": "inventory123",
    "database.dbname" : "inventory",
    "topic.prefix": "fulfillment",
    "snapshot.mode": "when_needed"
  }
}'
```

# Commands for Confirming the Connector

## SQL DB Structure
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

## Deleting a connector
```bash
curl -X DELETE http://localhost:8083/connectors/fulfillment-connector
```

## View the topics
> Run this from any broker container
```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server broker-1:19092 --list
```

## View one topic stream
To view a topic for a table, use `fulfillment.public.{tablename}`
To view the full history of a table, add `--from-beginning`
> Run this from any broker container
```bash
 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server broker-1:19092 --topic fulfillment.public.products
```

## Open connection to postgres
> Does not have to be run from a broker container
```bash
psql "postgresql://inventory:inventory123@localhost:5432/inventory"
```

### Example table changes
```sql
INSERT INTO products (sku, quantity_on_hand) VALUES ('teast', 100000);
```

```sql
INSERT INTO orders VALUES (1, 1);
```


# Adding the clickhouse sink connector (consumer)

```bash
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{ 
"name": "fulfillment-sink-clickhouse",
"config": {
    "connector.class": "com.clickhouse.kafka.connect.ClickHouseSinkConnector",
    "tasks.max": 1,
    "topics": "fulfillment.public.orders",
    "hostname": "172.22.0.10",
    "port": 8123,
    "database": "clickhouseconsumer",
    "username": "clickhouseconsumer",
    "password": "clickhouseconsumer123",
    "value.converter.schemas.enable": "false",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "exactlyOnce": "true",
    "schemas.enable": "false",
    "schema.evolution": "alter",
    "auto.create.tables": "true"
  }
}'
```
## Deleting a Sink Connector
```bash
curl -X DELETE http://localhost:8083/connectors/fulfillment-sink-clickhouse
```


# Useful Endpoints
http://localhost:8083/connectors
http://localhost:8083/connector-plugins
http://localhost:8083/connector-plugins/{plugin-name}/config