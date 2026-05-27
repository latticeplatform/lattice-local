import type {
  KCConnectorExpandedEntry,
  KCConnectorInfo,
  KCConnectorsExpandedResponse,
  KCConnectorStateInfo,
  KCPluginInfo,
  KCConfigKeyInfo,
  KCConfigInfos,
} from '../types/index.js';
import { config } from '../config.js';
import axios from 'axios';
import {
  applyDefaults,
  getAutofilledKeys,
  isFieldHidden,
  markPasswordsRequired,
} from '../utils/index.js';

const CONNECT_URL = config.kafkaConnect.url;
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const kafkaConnectService = {
  getConnectors: async (): Promise<KCConnectorsExpandedResponse> => {
    const { data } = await axios.get<KCConnectorsExpandedResponse>(
      `${CONNECT_URL}/connectors?expand=info&expand=status`
    );
    for (const entry of Object.values(data)) {
      const connectorClass = entry.info.config['connector.class'] ?? '';
      entry.autofilled_keys = getAutofilledKeys(connectorClass);
    }
    return data;
  },

  getConnector: async (name: string): Promise<KCConnectorExpandedEntry> => {
    const [infoRes, statusRes] = await Promise.all([
      axios.get<KCConnectorInfo>(`${CONNECT_URL}/connectors/${name}`),
      axios.get<KCConnectorStateInfo>(`${CONNECT_URL}/connectors/${name}/status`),
    ]);
    const connectorClass = infoRes.data.config['connector.class'] ?? '';
    return {
      info: infoRes.data,
      status: statusRes.data,
      autofilled_keys: getAutofilledKeys(connectorClass),
    };
  },

  createConnector: async (body: Record<string, unknown>): Promise<KCConnectorInfo> => {
    const mergedConfig = applyDefaults((body.config as Record<string, string> | undefined) ?? {});
    const { data } = await axios.post<KCConnectorInfo>(
      `${CONNECT_URL}/connectors`,
      { ...body, config: mergedConfig },
      { headers: JSON_HEADERS }
    );
    return data;
  },

  deleteConnector: async (name: string): Promise<void> => {
    await axios.delete(`${CONNECT_URL}/connectors/${name}`);
  },

  pauseConnector: async (name: string): Promise<void> => {
    await axios.put(`${CONNECT_URL}/connectors/${name}/pause`, null, { headers: JSON_HEADERS });
  },

  resumeConnector: async (name: string): Promise<void> => {
    await axios.put(`${CONNECT_URL}/connectors/${name}/resume`, null, { headers: JSON_HEADERS });
  },

  restartConnector: async (name: string): Promise<void> => {
    await axios.post(`${CONNECT_URL}/connectors/${name}/restart`, null, { headers: JSON_HEADERS });
  },

  restartTask: async (name: string, taskId: string): Promise<void> => {
    await axios.post(`${CONNECT_URL}/connectors/${name}/tasks/${taskId}/restart`, null, {
      headers: JSON_HEADERS,
    });
  },

  getPlugins: async (): Promise<KCPluginInfo[]> => {
    const { data } = await axios.get<KCPluginInfo[]>(`${CONNECT_URL}/connector-plugins`);
    return data;
  },

  getPluginConfig: async (pluginClass: string): Promise<KCConfigKeyInfo[]> => {
    const { data } = await axios.get<KCConfigKeyInfo[]>(
      `${CONNECT_URL}/connector-plugins/${pluginClass}/config`
    );
    return data.filter((def) => !isFieldHidden(pluginClass, def.name));
  },

  validatePluginConfig: async (
    pluginClass: string,
    inputConfig: Record<string, string>
  ): Promise<KCConfigInfos> => {
    const configWithDefaults = applyDefaults({ ...inputConfig, 'connector.class': pluginClass });
    const { data } = await axios.put<KCConfigInfos>(
      `${CONNECT_URL}/connector-plugins/${pluginClass}/config/validate`,
      configWithDefaults,
      { headers: JSON_HEADERS }
    );
    data.configs = data.configs.filter((c) => !isFieldHidden(pluginClass, c.definition.name));
    markPasswordsRequired(data, configWithDefaults);
    data.error_count = data.configs.filter((c) => (c.value?.errors.length ?? 0) > 0).length;
    return data;
  },

  getTopics: async (): Promise<Record<string, { topics: string[] }>> => {
    const { data: connectors } = await axios.get<string[]>(`${CONNECT_URL}/connectors`);
    const topics: Record<string, { topics: string[] }> = {};
    await Promise.all(
      connectors.map(async (connector) => {
        const { data } = await axios.get<Record<string, { topics: string[] }>>(
          `${CONNECT_URL}/connectors/${connector}/topics`
        );
        Object.assign(topics, data);
      })
    );
    return topics;
  },
};
export default kafkaConnectService;
