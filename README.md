# kafka-infrastructure

## Adding the debezium pg-connector
Make sure you replace the hostname with the hostname of the postgres container.
```bash
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{ 
  "name": "fulfillment-connector",
  "config": {
    "plugin.name": "pgoutput",
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "172.20.0.9", 
    "database.port": "5432",
    "database.user": "inventory",
    "database.password": "inventory123",
    "database.dbname" : "inventory",
    "topic.prefix": "fulfillment",
    "snapshot.mode": "when_needed"
  }
}'
```

## Deleting a connector
```bash
curl -X DELETE http://localhost:8083/connectors/fulfillment-connector
```

# Useful commands


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
INSERT INTO products (sku, quantity_on_hand) VALUES (1, 100000);
```

```sql
INSERT INTO orders VALUES (1, 1);
```
