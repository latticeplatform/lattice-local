# kafka-infrastructure

A Kafka-based CDC (Change Data Capture) pipeline using Debezium to stream PostgreSQL changes into ClickHouse.

# Commands for Confirming the Connector

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

## Instructions to Deploy VPC

Before running the bootstrap scripts in this repo, each person should have:

- `bash`
- `python3`
- `ssh`
- `psql` if you want to use `./provision-vpc.sh tunnel`

Clone repository and navigate to root directory
```bash
git@github.com:2603-6/kafka-infrastructure.git && cd kafka-infrastructure
```

Create a root `.env` file with AWS credentials that can authenticate to your target AWS account and create the VPC resources used by this stack.
```
AWS_ACCESS_KEY_ID=<your_access_key_id>
AWS_SECRET_ACCESS_KEY=<your_access_secret_access_key>
AWS_REGION=us-west-2
```

Create an SSH public key file in the following path. The private key is assumed to be the same path without the `.pub` suffix.
```
~/.ssh/id_ed25519.pub
```

To download opentofu and the aws cli, run `setup_tools.sh`
```
./setup_tools.sh
```

To setup the VPC (CIDR range is 10.0.0.0/16), run `setup_vpc.sh`
(Setting up RDS will take a couple of minutes)
```
./setup_vpc.sh apply
```

This command tunnels through the bastion host to run psql directly against the
private RDS instance.
```
./setup_vpc.sh tunnel
```

# Instructions to teardown
To completely remove the VPC from your AWS account, go to the root directory and run
```
./setup_vpc.sh destroy
```

## SSH access input
The bastion host needs an SSH allowlist CIDR.

- The script auto-detects your public IP during `apply`
- If auto-detection fails, you can pass it explicitly with:

```bash
--bastion-ssh-cidr 203.0.113.10/32
```

# summary
- `./setup_tools.sh` verifies the local toolchain and checks `.env`
- `./setup_vpc.sh apply` creates the VPC, bastion, and private RDS instance
- `./setup_vpc.sh tunnel` opens a local SSH tunnel and runs `psql` against `localhost`

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

| Endpoint                                                       | Description              |
|----------------------------------------------------------------|--------------------------|
| `http://localhost:8083/connectors`                             | List / manage connectors |
| `http://localhost:8083/connector-plugins`                      | List available plugins   |
| `http://localhost:8083/connector-plugins/{plugin-name}/config` | Plugin config schema     |