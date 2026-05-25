import type {
  ConfigDefinition,
  ConnectorEntry,
  TopicGroup,
  TopicSchemaResult,
  ValidationResult,
} from './connect';

export type ConnectDispatchAction =
  // Connector
  | { type: 'CONNECTOR_FETCH';        name: string }
  | { type: 'CONNECTOR_CREATE';       name: string; config: Record<string, string> }
  | { type: 'CONNECTOR_REMOVE';       name: string }
  | { type: 'CONNECTOR_PAUSE';        name: string }
  | { type: 'CONNECTOR_RESUME';       name: string }
  | { type: 'CONNECTOR_RESTART';      name: string }
  | { type: 'CONNECTOR_RESTART_TASK'; name: string; taskId: number }
  // Plugin
  | { type: 'PLUGIN_FETCH_CONFIG';    pluginClass: string }
  | { type: 'PLUGIN_VALIDATE_CONFIG'; pluginClass: string; config: Record<string, string> }
  // Topic
  | { type: 'TOPIC_FETCH_GROUPS' }
  | { type: 'TOPIC_FETCH_SCHEMA';     topicName: string }
  | { type: 'TOPIC_CREATE_GROUP';     name: string; topics: string[] }
  | { type: 'TOPIC_UPDATE_GROUP';     oldName: string; name: string; topics: string[] }
  | { type: 'TOPIC_DELETE_GROUP';     name: string };

export interface ActionResultMap {
  CONNECTOR_FETCH:        ConnectorEntry;
  CONNECTOR_CREATE:       ConnectorEntry;
  CONNECTOR_REMOVE:       void;
  CONNECTOR_PAUSE:        void;
  CONNECTOR_RESUME:       void;
  CONNECTOR_RESTART:      void;
  CONNECTOR_RESTART_TASK: void;
  PLUGIN_FETCH_CONFIG:    ConfigDefinition[];
  PLUGIN_VALIDATE_CONFIG: ValidationResult;
  TOPIC_FETCH_GROUPS:     TopicGroup[];
  TOPIC_FETCH_SCHEMA:     TopicSchemaResult;
  TOPIC_CREATE_GROUP:     TopicGroup;
  TOPIC_UPDATE_GROUP:     TopicGroup;
  TOPIC_DELETE_GROUP:     void;
}

export type ConnectDispatch = <A extends ConnectDispatchAction>(
  action: A,
) => Promise<ActionResultMap[A['type']]>;

