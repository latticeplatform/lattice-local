import type { ConnectorEntry, ConnectorInfo, ConnectorsResponse } from '../types';
import { request, voidRequest, withRetry } from '../utils';

interface ConnectorApi {
  fetch: (name: string) => Promise<ConnectorEntry>;
  fetchAll: () => Promise<ConnectorsResponse>;
  remove: (name: string) => Promise<void>;
  pause: (name: string) => Promise<void>;
  resume: (name: string) => Promise<void>;
  restart: (name: string) => Promise<void>;
  restartTask: (name: string, taskId: number) => Promise<void>;
  create: (name: string, config: Record<string, string>) => Promise<ConnectorEntry>;
  patch: (name: string, config: Record<string, string>) => Promise<ConnectorInfo>;
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

  const create = async (name: string, config: Record<string, string>): Promise<ConnectorEntry> => {
    await request('/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config }),
    });
    return withRetry(() => request<ConnectorEntry>(`/connectors/${encodeURIComponent(name)}`));
  };

  const restartTask = (name: string, taskId: number): Promise<void> => {
    return voidRequest(`/connectors/${encodeURIComponent(name)}/tasks/${String(taskId)}/restart`, {
      method: 'POST',
    });
  };

  const patch = (name: string, config: Record<string, string>): Promise<ConnectorInfo> => {
    return request<ConnectorInfo>(`/connectors/${encodeURIComponent(name)}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  };

  return { fetch, fetchAll, remove, pause, resume, restart, restartTask, create, patch };
};
export default createConnectorApi;
