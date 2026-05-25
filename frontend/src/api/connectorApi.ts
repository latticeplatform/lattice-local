import type { ConnectorEntry, ConnectorsResponse } from '../types';
import { request, voidRequest } from '../utils';

interface ConnectorApi {
  fetch: (name: string) => Promise<ConnectorEntry>;
  fetchAll: () => Promise<ConnectorsResponse>;
  remove: (name: string) => Promise<void>;
  pause: (name: string) => Promise<void>;
  resume: (name: string) => Promise<void>;
  restart: (name: string) => Promise<void>;
  restartTask: (name: string, taskId: number) => Promise<void>;
  create: (name: string, config: Record<string, string>) => Promise<unknown>;
}

const createConnectorApi = (): ConnectorApi => {
  const fetchAll = (): Promise<ConnectorsResponse> => {
    return request<ConnectorsResponse>('/connectors');
  };

  const fetch = (name: string): Promise<ConnectorEntry> => {
    return request<ConnectorEntry>(`/connectors/${encodeURIComponent(name)}`);
  };

  const remove = (name: string): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}`, { method: 'DELETE' });
  };

  const pause = (name: string): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}/pause`, { method: 'PUT' });
  };

  const resume = (name: string): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}/resume`, { method: 'PUT' });
  };

  const restart = (name: string): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}/restart`, { method: 'POST' });
  };

  const create = (name: string, config: Record<string, string>): Promise<unknown> => {
    return request('/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
  };

  const restartTask = (name: string, taskId: number): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}/tasks/${taskId}/restart`, {
      method: 'POST',
    });
  };

  return { fetch, fetchAll, remove, pause, resume, restart, restartTask, create };
};
export default createConnectorApi;
