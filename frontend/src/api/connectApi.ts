import type {
  ConnectorsResponse,
  ConnectorEntry,
  ConnectorPlugin,
  ConfigDefinition,
  ValidationResult,
  TopicsResponse,
  TopicGroup,
  TopicSchemaResult,
} from '../types/connect';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
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

export const fetchConnectors = (): Promise<ConnectorsResponse> => {
  return request<ConnectorsResponse>('/connectors');
}

export const fetchConnector = (name: string): Promise<ConnectorEntry> => {
  return request<ConnectorEntry>(`/connectors/${encodeURIComponent(name)}`);
}

export const fetchPlugins = (): Promise<ConnectorPlugin[]> => {
  return request<ConnectorPlugin[]>('/connector-plugins');
}

export const fetchPluginConfig = (pluginClass: string): Promise<ConfigDefinition[]> => {
  return request<ConfigDefinition[]>(`/connector-plugins/${encodeURIComponent(pluginClass)}/config`);
}

export const validateConnectorConfig = (
  pluginClass: string,
  config: Record<string, string>,
): Promise<ValidationResult> => {
  return request<ValidationResult>(
    `/connector-plugins/${encodeURIComponent(pluginClass)}/config/validate`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) },
  );
}

export const createConnector = (name: string, config: Record<string, string>): Promise<unknown> => {
  return request(
    '/connectors',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, config }) },
  );
}

 const voidRequest = async (url: string, options?: RequestInit): Promise<void> => {
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

export const deleteConnector = (name: string): Promise<void> => {
  return voidRequest(`/connectors/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export const pauseConnector = (name: string): Promise<void> => {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/pause`, { method: 'PUT' });
}

export const resumeConnector = (name: string): Promise<void> => {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/resume`, { method: 'PUT' });
}

export const restartConnector = (name: string): Promise<void> => {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/restart`, { method: 'POST' });
}

export const restartTask = (name: string, taskId: number): Promise<void> => {
  return voidRequest(`/connectors/${encodeURIComponent(name)}/tasks/${taskId}/restart`, { method: 'POST' });
}

export const fetchTopics = (): Promise<TopicsResponse> => {
  return request<TopicsResponse>('/topics', {method: 'GET'});
}

export const fetchTopicGroups = (): Promise<TopicGroup[]> =>
  request<TopicGroup[]>('/topic-groups');

export const createTopicGroup = (name: string, topics: string[]): Promise<TopicGroup> =>
  request<TopicGroup>('/topic-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, topics }),
  });

export const updateTopicGroup = (oldName: string, name: string, topics: string[]): Promise<TopicGroup> =>
  request<TopicGroup>(`/topic-groups/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, topics }),
  });

export const deleteTopicGroup = (name: string): Promise<void> =>
  voidRequest(`/topic-groups/${encodeURIComponent(name)}`, { method: 'DELETE' });

export const fetchTopicSchema = (topicName: string): Promise<TopicSchemaResult> =>
  request<TopicSchemaResult>(`/admin/topics/${encodeURIComponent(topicName)}/schema`);