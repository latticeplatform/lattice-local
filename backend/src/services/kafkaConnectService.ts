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
import { connectLogger } from '../logger.js';

const CONNECT_URL = config.kafkaConnect.url;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const kafkaConnectService = {
  getConnectors: async (): Promise<KCConnectorsExpandedResponse> => {
    connectLogger.debug('fetching all connectors');
    const { data } = await axios.get<KCConnectorsExpandedResponse>(
      `${CONNECT_URL}/connectors?expand=info&expand=status`
    );
    for (const entry of Object.values(data)) {
      const connectorClass = entry.info.config['connector.class'] ?? '';
      entry.autofilled_keys = getAutofilledKeys(connectorClass);
    }
    connectLogger.debug({ count: Object.keys(data).length }, 'connectors fetched');
    return data;
  },

  getConnector: async (name: string): Promise<KCConnectorExpandedEntry> => {
    connectLogger.debug({ connector: name }, 'fetching connector');
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
    connectLogger.info({ connector: body.name, class: mergedConfig['connector.class'] }, 'creating connector');
    const { data } = await axios.post<KCConnectorInfo>(
      `${CONNECT_URL}/connectors`,
      { ...body, config: mergedConfig },
      { headers: JSON_HEADERS }
    );
    connectLogger.info({ connector: data.name }, 'connector created');
    return data;
  },

  deleteConnector: async (name: string): Promise<void> => {
    connectLogger.info({ connector: name }, 'deleting connector');
    await axios.delete(`${CONNECT_URL}/connectors/${name}`);
    connectLogger.info({ connector: name }, 'connector deleted');
  },

  pauseConnector: async (name: string): Promise<void> => {
    connectLogger.info({ connector: name }, 'pausing connector');
    await axios.put(`${CONNECT_URL}/connectors/${name}/pause`, null, { headers: JSON_HEADERS });
  },

  resumeConnector: async (name: string): Promise<void> => {
    connectLogger.info({ connector: name }, 'resuming connector');
    await axios.put(`${CONNECT_URL}/connectors/${name}/resume`, null, { headers: JSON_HEADERS });
  },

  restartConnector: async (name: string): Promise<void> => {
    connectLogger.info({ connector: name }, 'restarting connector');
    await axios.post(`${CONNECT_URL}/connectors/${name}/restart`, null, { headers: JSON_HEADERS });
  },

  restartTask: async (name: string, taskId: string): Promise<void> => {
    connectLogger.info({ connector: name, taskId }, 'restarting task');
    await axios.post(`${CONNECT_URL}/connectors/${name}/tasks/${taskId}/restart`, null, {
      headers: JSON_HEADERS,
    });
  },

  getPlugins: async (): Promise<KCPluginInfo[]> => {
    connectLogger.debug('fetching connector plugins');
    const { data } = await axios.get<KCPluginInfo[]>(`${CONNECT_URL}/connector-plugins`);
    connectLogger.debug({ count: data.length }, 'plugins fetched');
    return data;
  },

  getPluginConfig: async (pluginClass: string): Promise<KCConfigKeyInfo[]> => {
    connectLogger.debug({ pluginClass }, 'fetching plugin config definition');
    const { data } = await axios.get<KCConfigKeyInfo[]>(
      `${CONNECT_URL}/connector-plugins/${pluginClass}/config`
    );
    return data.filter((def) => !isFieldHidden(pluginClass, def.name));
  },

  validatePluginConfig: async (
    pluginClass: string,
    inputConfig: Record<string, string>
  ): Promise<KCConfigInfos> => {
    connectLogger.debug({ pluginClass }, 'validating plugin config');
    const configWithDefaults = applyDefaults({ ...inputConfig, 'connector.class': pluginClass });
    const { data } = await axios.put<KCConfigInfos>(
      `${CONNECT_URL}/connector-plugins/${pluginClass}/config/validate`,
      configWithDefaults,
      { headers: JSON_HEADERS }
    );
    data.configs = data.configs.filter((c) => !isFieldHidden(pluginClass, c.definition.name));
    markPasswordsRequired(data, configWithDefaults);
    data.error_count = data.configs.filter((c) => (c.value?.errors.length ?? 0) > 0).length;
    connectLogger.debug({ pluginClass, errorCount: data.error_count }, 'plugin config validated');
    return data;
  },

  getTopics: async (): Promise<Record<string, { topics: string[] }>> => {
    connectLogger.debug('fetching active topics');
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
