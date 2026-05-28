/** Types derived from the Kafka Connect REST API OpenAPI spec (connect_rest.yaml, v4.3.0). */

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export type KCPluginType =
  | 'source'
  | 'sink'
  | 'converter'
  | 'header_converter'
  | 'transformation'
  | 'predicate'
  | 'configprovider'
  | 'rest_extension'
  | 'connector_client_config_override_policy';

export interface KCPluginInfo {
  class: string;
  type: KCPluginType;
  version: string;
}

// ---------------------------------------------------------------------------
// Config definitions (GET /connector-plugins/{name}/config)
// ---------------------------------------------------------------------------

export interface KCConfigKeyInfo {
  name: string;
  type: string;
  required: boolean;
  default_value: string | null;
  importance: string;
  documentation: string;
  group: string | null;
  display_name: string;
  order_in_group: number;
  width: string | null;
  dependents: string[];
}

// ---------------------------------------------------------------------------
// Config validation (PUT /connector-plugins/{name}/config/validate)
// ---------------------------------------------------------------------------

export interface KCConfigValueInfo {
  name: string;
  value: string | null;
  recommended_values: string[];
  errors: string[];
  visible: boolean;
}

export interface KCConfigInfo {
  definition?: KCConfigKeyInfo;
  value: KCConfigValueInfo | null;
}

export interface KCConfigInfos {
  name: string;
  error_count: number;
  groups: string[];
  configs: KCConfigInfo[];
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export type KCConnectorType = 'source' | 'sink' | 'unknown';

export interface KCConnectorTaskId {
  connector: string;
  task: number;
}

export interface KCConnectorInfo {
  name: string;
  config: Record<string, string>;
  tasks: KCConnectorTaskId[];
  type: KCConnectorType;
}

export interface KCConnectorState {
  state: string;
  worker_id: string;
  trace?: string;
  version?: string;
}

export interface KCTaskState {
  id: number;
  state: string;
  worker_id: string;
  trace?: string;
  version?: string;
}

export interface KCConnectorStateInfo {
  name: string;
  type: KCConnectorType;
  connector: KCConnectorState;
  tasks: KCTaskState[];
}

export interface KCConnectorExpandedEntry {
  info: KCConnectorInfo;
  status: KCConnectorStateInfo;
  autofilled_keys: string[];
}

type KCConnectorResponse<T> = Record<string, T>;

type KCConnectorResponseMap = {
  list: string[];

  info: KCConnectorResponse<{
    info: KCConnectorInfo;
  }>;

  status: KCConnectorResponse<{
    status: KCConnectorStateInfo;
  }>;

  'info-status': KCConnectorResponse<{
    info: KCConnectorInfo;
    status: KCConnectorStateInfo;
  }>;

  'info-status-autofilled': KCConnectorResponse<KCConnectorExpandedEntry>;
};

export type KCConnectorsResponse<T extends keyof KCConnectorResponseMap> =
  KCConnectorResponseMap[T];

export type KCConnectorsResponseVariantsWithInfo = {
  [K in keyof KCConnectorResponseMap]: KCConnectorResponseMap[K] extends Record<
    string,
    { info: KCConnectorInfo }
  >
    ? K
    : never;
}[keyof KCConnectorResponseMap];

export interface KafkaConnectService {
  getConnectors: () => Promise<KCConnectorsResponse<'info-status-autofilled'>>;
  getConnector: (name: string) => Promise<KCConnectorExpandedEntry>;
  createConnector: (body: Record<string, unknown>) => Promise<KCConnectorInfo>;
  deleteConnector: (name: string) => Promise<void>;
  pauseConnector: (name: string) => Promise<void>;
  resumeConnector: (name: string) => Promise<void>;
  restartConnector: (name: string) => Promise<void>;
  restartTask: (name: string, taskId: string) => Promise<void>;
  getPlugins: () => Promise<KCPluginInfo[]>;
  getPluginConfig: (pluginClass: string) => Promise<KCConfigKeyInfo[]>;
  validatePluginConfig: (
    pluginClass: string,
    inputConfig: Record<string, string>
  ) => Promise<KCConfigInfos>;
  getTopics: () => Promise<Record<string, { topics: string[] }>>;
}
