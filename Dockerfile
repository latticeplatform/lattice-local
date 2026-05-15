FROM quay.io/debezium/connect:3.4.0.Final AS base
LABEL authors="kess"

USER root
RUN curl -fsSL https://github.com/ClickHouse/clickhouse-kafka-connect/releases/download/v1.3.8/clickhouse-kafka-connect-v1.3.8.zip \
      -o /tmp/clickhouse-connector-sink.zip \
    && unzip /tmp/clickhouse-connector-sink.zip -d /kafka/connect/clickhouse-connector-sink \
    && rm /tmp/clickhouse-connector-sink.zip
USER kafka
