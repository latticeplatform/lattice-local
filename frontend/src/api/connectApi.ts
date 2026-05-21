import type {
  ConnectorsResponse,
  ConnectorEntry,
  ConnectorPlugin,
  ConfigDefinition,
  ValidationResult,
} from '../types/connect';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, options);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json() as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch { /* non-JSON error body, keep status text */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function fetchConnectors(): Promise<ConnectorsResponse> {
  return request<ConnectorsResponse>('/connectors');
}

export function fetchConnector(name: string): Promise<ConnectorEntry> {
  return request<ConnectorEntry>(`/connectors/${encodeURIComponent(name)}`);
}

export function fetchPlugins(): Promise<ConnectorPlugin[]> {
  return request<ConnectorPlugin[]>('/connector-plugins');
}

export function fetchPluginConfig(pluginClass: string): Promise<ConfigDefinition[]> {
  return request<ConfigDefinition[]>(`/connector-plugins/${encodeURIComponent(pluginClass)}/config`);
}

export function validateConnectorConfig(
  pluginClass: string,
  config: Record<string, string>,
): Promise<ValidationResult> {
  return request<ValidationResult>(
    `/connector-plugins/${encodeURIComponent(pluginClass)}/config/validate`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) },
  );
}

export function createConnector(name: string, config: Record<string, string>): Promise<unknown> {
  return request(
    '/connectors',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config }) },
  );
}

async function voidRequest(url: string, options?: RequestInit): Promise<void> {
  const res = await fetch(`/api${url}`, options);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json() as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch { /* non-JSON error body, keep status text */ }
    throw new Error(message);
  }
}

export function deleteConnector(name: string): Promise<void> {
  return voidRequest(`/connectors/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export function pauseConnector(name: string): Promise<void> {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/pause`, { method: 'PUT' });
}

export function resumeConnector(name: string): Promise<void> {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/resume`, { method: 'PUT' });
}

export function restartConnector(name: string): Promise<void> {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/restart`, { method: 'POST' });
}

export function restartTask(name: string, taskId: number): Promise<void> {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/tasks/${taskId}/restart`, { method: 'POST' });
}