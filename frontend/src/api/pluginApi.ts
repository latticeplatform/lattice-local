import { request } from '../utils';
import type { ConfigDefinition, ConnectorPlugin, ValidationResult } from '../types';

interface PluginApi {
  fetchAll: () => Promise<ConnectorPlugin[]>;
  fetchConfig: (pluginClass: string) => Promise<ConfigDefinition[]>;
  validateConfig: (
    pluginClass: string,
    config: Record<string, string>
  ) => Promise<ValidationResult>;
}

const createPluginApi = (): PluginApi => {
  const fetchAll = (): Promise<ConnectorPlugin[]> => {
    return request<ConnectorPlugin[]>('/connector-plugins');
  };

  const fetchConfig = (pluginClass: string): Promise<ConfigDefinition[]> => {
    return request<ConfigDefinition[]>(
      `/connector-plugins/${encodeURIComponent(pluginClass)}/config`
    );
  };

  const validateConfig = (
    pluginClass: string,
    config: Record<string, string>
  ): Promise<ValidationResult> => {
    return request<ValidationResult>(
      `/connector-plugins/${encodeURIComponent(pluginClass)}/config/validate`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }
    );
  };

  return { fetchAll, fetchConfig, validateConfig };
};

export default createPluginApi;
