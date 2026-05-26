import { Router, type Response } from 'express';
import axios from 'axios';
import { config } from '../config.js';
import {
  markPasswordsRequired,
  isFieldHidden,
  applyDefaults,
  getAutofilledKeys,
} from '../utils/index.js';
import type {
  KCConfigInfos,
  KCConfigKeyInfo,
  KCConnectorInfo,
  KCConnectorStateInfo,
  KCConnectorsExpandedResponse,
  KCPluginInfo,
} from '../types/index.js';

const CONNECT_URL = config.kafkaConnect.url;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const proxyError = (err: unknown, res: Response) => {
  if (axios.isAxiosError(err) && err.response) {
    const { status, data } = err.response;
    res.status(status).json(data ?? { error: err.message });
  } else {
    res.status(502).json({ error: 'Failed to reach Kafka Connect' });
  }
};

const createKafkaConnectRouter = (): Router => {
  const router = Router();

  // GET /connectors -> Connector list (expanded with info + status)
  router.get('/connectors', async (_req, res) => {
    try {
      const { data } = await axios.get<KCConnectorsExpandedResponse>(
        `${CONNECT_URL}/connectors?expand=info&expand=status`
      );
      for (const entry of Object.values(data)) {
        const connectorClass = entry.info.config['connector.class'] ?? '';
        entry.autofilled_keys = getAutofilledKeys(connectorClass);
      }
      res.json(data);
    } catch (err) {
      proxyError(err, res);
    }
  });

  // GET /connectors/{name} -> Get a single connector (info + status combined)
  router.get('/connectors/:name', async (req, res) => {
    try {
      const [infoRes, statusRes] = await Promise.all([
        axios.get<KCConnectorInfo>(`${CONNECT_URL}/connectors/${req.params.name}`),
        axios.get<KCConnectorStateInfo>(`${CONNECT_URL}/connectors/${req.params.name}/status`),
      ]);
      const connectorClass = infoRes.data.config['connector.class'] ?? '';
      res.json({
        info: infoRes.data,
        status: statusRes.data,
        autofilled_keys: getAutofilledKeys(connectorClass),
      });
    } catch (err) {
      proxyError(err, res);
    }
  });

  // POST /connectors -> Create a new connector
  router.post('/connectors', async (req, res) => {
    let body: Record<string, unknown>;
    try {
      body = { ...req.body, config: applyDefaults(req.body.config ?? {}) };
      console.log(body);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    try {
      const { data } = await axios.post<KCConnectorInfo>(`${CONNECT_URL}/connectors`, body, {
        headers: JSON_HEADERS,
      });
      res.status(201).json(data);
    } catch (err) {
      proxyError(err, res);
    }
  });

  // DELETE /connectors/{name} -> Delete a connector by name
  router.delete('/connectors/:name', async (req, res) => {
    try {
      await axios.delete(`${CONNECT_URL}/connectors/${req.params.name}`);
      res.status(204).send();
    } catch (err) {
      proxyError(err, res);
    }
  });

  // PUT /connectors/{name}/pause -> Pause a connector
  router.put('/connectors/:name/pause', async (req, res) => {
    try {
      await axios.put(`${CONNECT_URL}/connectors/${req.params.name}/pause`, null, {
        headers: JSON_HEADERS,
      });
      res.status(202).send();
    } catch (err) {
      proxyError(err, res);
    }
  });

  // PUT /connectors/{name}/resume -> Resume a paused connector
  router.put('/connectors/:name/resume', async (req, res) => {
    try {
      await axios.put(`${CONNECT_URL}/connectors/${req.params.name}/resume`, null, {
        headers: JSON_HEADERS,
      });
      res.status(202).send();
    } catch (err) {
      proxyError(err, res);
    }
  });

  // POST /connectors/{name}/restart -> Restart a connector
  router.post('/connectors/:name/restart', async (req, res) => {
    try {
      await axios.post(`${CONNECT_URL}/connectors/${req.params.name}/restart`, null, {
        headers: JSON_HEADERS,
      });
      res.status(200).send();
    } catch (err) {
      proxyError(err, res);
    }
  });

  // POST /connectors/{name}/tasks/{taskId}/restart -> Restart a single task
  router.post('/connectors/:name/tasks/:taskId/restart', async (req, res) => {
    try {
      await axios.post(
        `${CONNECT_URL}/connectors/${req.params.name}/tasks/${req.params.taskId}/restart`,
        null,
        { headers: JSON_HEADERS }
      );
      res.status(200).send();
    } catch (err) {
      proxyError(err, res);
    }
  });

  // GET /connector-plugins -> Connector plugin list
  router.get('/connector-plugins', async (_req, res) => {
    try {
      const { data } = await axios.get<KCPluginInfo[]>(`${CONNECT_URL}/connector-plugins`);
      res.json(data);
    } catch (err) {
      proxyError(err, res);
    }
  });

  // GET /connector-plugins/{pluginClass}/config -> Config definitions for a plugin
  router.get('/connector-plugins/:pluginClass/config', async (req, res) => {
    try {
      const { data } = await axios.get<KCConfigKeyInfo[]>(
        `${CONNECT_URL}/connector-plugins/${req.params.pluginClass}/config`
      );
      const filtered = data.filter((def) => !isFieldHidden(req.params.pluginClass, def.name));
      res.json(filtered);
    } catch (err) {
      proxyError(err, res);
    }
  });

  // PUT /connector-plugins/{pluginClass}/config/validate -> Validate a connector configuration
  router.put('/connector-plugins/:pluginClass/config/validate', async (req, res) => {
    try {
      const pluginClass = req.params.pluginClass;
      const configWithDefaults = applyDefaults({ ...req.body, 'connector.class': pluginClass });
      const { data } = await axios.put<KCConfigInfos>(
        `${CONNECT_URL}/connector-plugins/${pluginClass}/config/validate`,
        configWithDefaults,
        { headers: JSON_HEADERS }
      );
      // Strip hidden fields from the response before returning to the frontend.
      data.configs = data.configs.filter((c) => !isFieldHidden(pluginClass, c.definition.name));
      markPasswordsRequired(data, configWithDefaults);
      data.error_count = data.configs.filter((c) => (c.value?.errors.length ?? 0) > 0).length;
      res.json(data);
    } catch (err) {
      proxyError(err, res);
    }
  });

  // GET /topics -> Active topics keyed by connector name
  router.get('/topics', async (_req, res) => {
    try {
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
      return res.json(topics);
    } catch (err) {
      proxyError(err, res);
    }
  });

  return router;
};

export default createKafkaConnectRouter;
