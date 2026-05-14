# kafka-infrastructure

## Adding the debezium pg-connector

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
    "topic.prefix": "fulfillment"
  }
}'
```
Make sure you replace the hostname with the hostname of the postgres container.

# Useful commands
run from any broker container

## View the topics
```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server broker-1:19092 --list
```

## View one topic stream
To view a topic for a table, use `fulfillment.public.{tablename}` 
```bash
 /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server broker-1:19092 --topic fulfillment.public.orders
```
