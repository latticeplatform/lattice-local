<p align="center">
  <img src="lattice_logo.png" alt="Lattice Logo" width="500" />
</p>

# Lattice

Lattice is an open-source framework designed for fast and consistent data propagation in your CDC pipelines. Built to handle real-time data, you can have infrastructure running in a matter of minutes.

For more information, check out our case study: [Lattice Platform Case Study](https://latticeplatform.io/introduction)

For information on using the UI check out the [UI Guide](https://latticeplatform.io/using-lattice)

---


## Architecture

Lattice-local runs on a cluster of Docker containers and is composed of the following components:

- **Apache Kafka** — High-throughput distributed event streaming.
- **Kafka Connect with Debezium** — Change data capture from your source databases.
- **Apicurio Schema Registry** — Manages and stores schemas for Kafka messages, ensuring efficient data serialization and schema evolution.
- **Lattice UI** — Web interface for managing and monitoring your pipelines.

To deploy Lattice to AWS, see the [AWS deployment guide](https://github.com/latticeplatform/lattice_deployment). 

---

## Getting Started
Lattice provides a Docker Compose file to get started quickly. It is located in the `docker` directory.
 - Clone the repo
 - Navigate to the `backend` directory
 - Run `npm install`
 - Run `npm run dev:kafka`
 - Navigate to `http://localhost:5000` to access the UI

## Set up a PostgreSQL producer database
Lattice provides an example PostgreSQL database to produce events.
- Navigate to the `backend` directory
- Run `npm run dev:producers`

### Open a connection
```bash
psql "postgresql://inventory:inventory123@localhost:5432/inventory"
```

### Example queries
```sql
INSERT INTO products (sku, quantity_on_hand) VALUES ('test-sku', 100000);
```
```sql
INSERT INTO orders (product_id, quantity ) VALUES (1, 1);
```

## Set up a consumer databases
Lattice provides both Clickhouse and MongoDB example databases to consume events.
- Navigate to the `backend` directory
- Run `npm run dev:consumers`

### Open a ClickHouse shell
```bash
docker exec -it clickhouse clickhouse-client \
  --user clickhouseconsumer \
  --password clickhouseconsumer123 \
  --database clickhouseconsumer
```

### Create table
The table name must match the topic name.
```sql
CREATE TABLE <topic prefix>.public.<source topic name> (
     id               Int32,
     sku              String,
     quantity_on_hand Int32,
     op               String,
     source_ts_ms     Int64,
     __deleted        String DEFAULT 'false'
) ENGINE = ReplacingMergeTree()
  ORDER BY id;

```

---

## Useful API Endpoints

| Endpoint                                                     | Description              |
|--------------------------------------------------------------|--------------------------|
| http://localhost:8083/connectors                             | List / manage connectors |
| http://localhost:8083/connector-plugins                      | List available plugins   |
| http://localhost:8083/connector-plugins/{plugin-name}/config | Plugin config schema     |
| http://localhost:5000                                        | Lattice UI               |
