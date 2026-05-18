FROM quay.io/debezium/connect:3.4.0.Final AS base
LABEL authors="kess"

USER root

ARG CLICKHOUSE_CONNECTOR_VERSION=1.3.8
ARG CLICKHOUSE_CONNECTOR_DIR=/kafka/connect/clickhouse-kafka-connect-${CLICKHOUSE_CONNECTOR_VERSION}

RUN mkdir -p "${CLICKHOUSE_CONNECTOR_DIR}" \
    && curl -fsSL "https://github.com/ClickHouse/clickhouse-kafka-connect/releases/download/v${CLICKHOUSE_CONNECTOR_VERSION}/clickhouse-kafka-connect-v${CLICKHOUSE_CONNECTOR_VERSION}.zip" \
      -o /tmp/clickhouse-kafka-connect.zip \
    && unzip /tmp/clickhouse-kafka-connect.zip -d "${CLICKHOUSE_CONNECTOR_DIR}" \
    && rm /tmp/clickhouse-kafka-connect.zip \
    && chown -R kafka:kafka "${CLICKHOUSE_CONNECTOR_DIR}"

USER kafka