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
