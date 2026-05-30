export type ConnectorState = 'RUNNING' | 'PAUSED' | 'FAILED' | 'UNASSIGNED';
export type ConnectorType = 'source' | 'sink';

export interface ConnectorStatus {
  name: string;
  connector: { state: ConnectorState; worker_id: string };
  tasks: ConnectorTask[];
  type: ConnectorType;
}

export interface ConnectorTask {
  id: number;
  state: ConnectorState;
  worker_id: string;
}

export interface ConnectorInfo {
  name: string;
  config: Record<string, string>;
  tasks: Array<{ connector: string; task: number }>;
  type: ConnectorType;
}

export interface ConnectorEntry {
  info: ConnectorInfo;
  status: ConnectorStatus;
  autofilled_keys: string[];
}

export type ConnectorsResponse = Record<string, ConnectorEntry>;

export interface ConnectorPlugin {
  class: string;
  type: 'source' | 'sink' | 'transformation' | 'predicate' | 'converter';
  version: string;
}

export type ConfigFieldType =
  | 'STRING'
  | 'INT'
  | 'SHORT'
  | 'LONG'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'LIST'
  | 'CLASS'
  | 'PASSWORD';

export interface ConfigDefinition {
  name: string;
  type: ConfigFieldType;
  required: boolean;
  default_value: string | null;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  documentation: string;
  group: string | null;
  display_name: string;
  order: number;
}

export interface ValidationFieldResult {
  definition: ConfigDefinition;
  value: ValidationFieldResultValue | null;
}

export interface ValidationFieldResultValue {
  name: string;
  value: string | null;
  errors: string[];
  visible: boolean;
}

export interface ValidationResult {
  name: string;
  error_count: number;
  configs: ValidationFieldResult[];
}

export interface TopicGroup {
  name: string;
  topics: string[];
}

export type TopicsResponse = Record<string, { topics: string[] }>;

export interface AvroConnectMeta {
  'connect.name'?: string;
  'connect.version'?: number;
  'connect.default'?: string;
  'connect.parameters'?: Record<string, string>;
}

export interface AvroRecordType extends AvroConnectMeta {
  type: 'record';
  name: string;
  namespace?: string;
  doc?: string;
  fields: AvroField[];
}

export interface AvroEnumType extends AvroConnectMeta {
  type: 'enum';
  name: string;
  namespace?: string;
  doc?: string;
  symbols: string[];
}

export interface AvroArrayType extends AvroConnectMeta {
  type: 'array';
  items: AvroType;
}

export interface AvroMapType extends AvroConnectMeta {
  type: 'map';
  values: AvroType;
}

// A primitive used as an object (e.g., annotated with connect metadata)
export interface AvroAnnotatedPrimitive extends AvroConnectMeta {
  type: 'null' | 'boolean' | 'int' | 'long' | 'float' | 'double' | 'bytes' | 'string';
}

export type AvroComplexType =
  | AvroRecordType
  | AvroEnumType
  | AvroArrayType
  | AvroMapType
  | AvroAnnotatedPrimitive;

// A string is either an AVRO primitive name or a named type reference
// An array represents an AVRO union
export type AvroType = string | AvroComplexType | AvroType[];

export interface AvroField {
  name: string;
  type: AvroType;
  default?: unknown;
  doc?: string;
}

export interface TopicSchemaResult {
  source: string;
  schemaId?: number;
  schemaType?: string;
  name: string;
  namespace: string;
  fields: AvroField[];
  raw: string;
}

export interface ConnectState {
  collectors: ConnectorEntry[];
  sinks: ConnectorEntry[];
  plugins: ConnectorPlugin[] | null;
  topics: TopicsResponse;
  loading: boolean;
}

export type ConnectAction =
  | { type: 'LOAD_START' }
  | {
      type: 'LOAD_SUCCESS';
      connectors: ConnectorsResponse;
      plugins: ConnectorPlugin[];
      topics: TopicsResponse;
    }
  | { type: 'LOAD_ERROR' }
  | { type: 'CONNECTOR_CREATED'; entry: ConnectorEntry }
  | { type: 'CONNECTOR_DELETED'; name: string }
  | { type: 'CONNECTOR_PAUSED'; name: string }
  | { type: 'CONNECTOR_RESUMED'; name: string }
  | { type: 'CONNECTOR_RESTARTED'; name: string }
  | { type: 'CONNECTOR_UPDATED'; name: string; entry: Partial<ConnectorEntry> }
  | { type: 'TASK_RESTARTED'; connectorName: string; taskId: number };
