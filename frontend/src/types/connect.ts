export type ConnectorState = 'RUNNING' | 'PAUSED' | 'FAILED' | 'UNASSIGNED';
export type ConnectorType = 'source' | 'sink';

export interface ConnectorStatus {
  name: string;
  connector: { state: ConnectorState; worker_id: string };
  tasks: Array<{ id: number; state: ConnectorState; worker_id: string }>;
  type: ConnectorType;
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
}

export type ConnectorsResponse = Record<string, ConnectorEntry>;

export interface ConnectorPlugin {
  class: string;
  type: 'source' | 'sink' | 'transformation' | 'predicate' | 'converter';
  version: string;
}

export type ConfigFieldType =
  | 'STRING' | 'INT' | 'SHORT' | 'LONG' | 'DOUBLE'
  | 'BOOLEAN' | 'LIST' | 'CLASS' | 'PASSWORD';

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

export interface TopicsResponse {
  [k:string]: {topics: string[]}
}

export interface TopicGroup {
  name: string;
  topics: string[];
}