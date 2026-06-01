import { Router } from 'express';
import { withProxiedError } from '../utils/index.js';
import type { KafkaConnectService } from '../types/index.js';

const createKafkaConnectRouter = (service: KafkaConnectService): Router => {
  const router = Router();

  // GET /connectors -> Connector list (expanded with info + status)
  router.get('/connectors', async (_req, res) => {
    res.json(await withProxiedError(service.getConnectors, res));
  });

  // GET /connectors/{name} -> Get a single connector (info + status combined)
  router.get('/connectors/:name', async (req, res) => {
    res.json(await withProxiedError(() => service.getConnector(req.params.name), res));
  });

  // POST /connectors -> Create a new connector
  router.post('/connectors', async (req, res) => {
    const body = req.body as Record<string, unknown>;
    if (!(body.config as Record<string, unknown> | undefined)?.['connector.class']) {
      res.status(400).json({ error: 'connector.class is required' });
      return;
    }
    res.status(201).json(await withProxiedError(() => service.createConnector(body), res));
  });

  // DELETE /connectors/{name} -> Delete a connector by name
  router.delete('/connectors/:name', async (req, res) => {
    const result = await withProxiedError(() => service.deleteConnector(req.params.name), res);
    if (result !== undefined) {
      res.json(result);
    } else {
      res.status(204).send();
    }
  });

  // PUT /connectors/{name}/pause -> Pause a connector
  router.put('/connectors/:name/pause', async (req, res) => {
    const result = await withProxiedError(() => service.pauseConnector(req.params.name), res);
    if (result !== undefined) {
      res.json(result);
    } else {
      res.status(202).send();
    }
  });

  // PUT /connectors/{name}/resume -> Resume a paused connector
  router.put('/connectors/:name/resume', async (req, res) => {
    const result = await withProxiedError(() => service.resumeConnector(req.params.name), res);
    if (result !== undefined) {
      res.json(result);
    } else {
      res.status(202).send();
    }
  });

  // POST /connectors/{name}/restart -> Restart a connector
  router.post('/connectors/:name/restart', async (req, res) => {
    const result = await withProxiedError(() => service.restartConnector(req.params.name), res);
    if (result !== undefined) {
      res.json(result);
    } else {
      res.status(200).send();
    }
  });

  // POST /connectors/{name}/tasks/{taskId}/restart -> Restart a single task
  router.post('/connectors/:name/tasks/:taskId/restart', async (req, res) => {
    const result = await withProxiedError(
      () => service.restartTask(req.params.name, req.params.taskId),
      res
    );
    if (result !== undefined) {
      res.json(result);
    } else {
      res.status(200).send();
    }
  });

  // GET /connector-plugins -> Connector plugin list
  router.get('/connector-plugins', async (_req, res) => {
    res.json(await withProxiedError(service.getPlugins, res));
  });

  // GET /connector-plugins/{pluginClass}/config -> Config definitions for a plugin
  router.get('/connector-plugins/:pluginClass/config', async (req, res) => {
    res.json(await withProxiedError(() => service.getPluginConfig(req.params.pluginClass), res));
  });

  // PUT /connector-plugins/{pluginClass}/config/validate -> Validate a connector configuration
  router.put('/connector-plugins/:pluginClass/config/validate', async (req, res) => {
    res.json(
      await withProxiedError(
        () =>
          service.validatePluginConfig(req.params.pluginClass, req.body as Record<string, string>),
        res
      )
    );
  });

  // GET /topics -> Active topics keyed by connector name
  router.get('/topics', async (_req, res) => {
    res.json(await withProxiedError(service.getTopics, res));
  });

  router.patch('/connectors/:name/config', async (req, res) => {
    res.json(
      await withProxiedError(
        () => service.patchConnector(req.params.name, req.body as Record<string, string>),
        res
      )
    );
  });

  return router;
};

export default createKafkaConnectRouter;
