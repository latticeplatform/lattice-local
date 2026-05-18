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