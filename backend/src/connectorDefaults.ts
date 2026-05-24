import dotenv from "dotenv";
dotenv.config();

// Opinionated per-class defaults that the backend injects before forwarding to Kafka Connect.
// The frontend uses `getAutofilledKeys` to know which config fields to hide.

const apicurioUrl = process.env.APICURIO_REGISTRY_URL ?? "http://apicurio:8080/apis/registry/v2";

export const CONNECTOR_DEFAULTS: Record<string, Record<string, string>> = {
  "io.debezium.connector.postgresql.PostgresConnector": {
    "plugin.name": "pgoutput",
    "snapshot.mode": "when_needed",
    "key.converter": "io.apicurio.registry.utils.converter.AvroConverter",
    "key.converter.apicurio.registry.url": apicurioUrl,
    "key.converter.apicurio.registry.auto-register": "true",
    "value.converter": "io.apicurio.registry.utils.converter.AvroConverter",
    "value.converter.apicurio.registry.url": apicurioUrl,
    "value.converter.apicurio.registry.auto-register": "true",
  },
  "com.clickhouse.kafka.connect.ClickHouseSinkConnector": {
    "key.converter": "io.apicurio.registry.utils.converter.AvroConverter",
    "key.converter.apicurio.registry.url": apicurioUrl,
    "value.converter": "io.apicurio.registry.utils.converter.AvroConverter",
    "value.converter.apicurio.registry.url": apicurioUrl,
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "transforms.unwrap.add.fields": "op,source.ts_ms:source_ts_ms",
  },
};

/** Merges opinionated defaults into a connector config. User-supplied values win. */
export function applyDefaults(config: Record<string, string>): Record<string, string> {
  if (!config["connector.class"]) {
    throw new Error("connector.class is required");
  }
  const defaults = CONNECTOR_DEFAULTS[config["connector.class"]] ?? {};
  return { ...defaults, ...config };
}

/** Returns the list of config keys that will be autofilled for a given connector class. */
export function getAutofilledKeys(connectorClass: string): string[] {
  return Object.keys(CONNECTOR_DEFAULTS[connectorClass] ?? {});
}