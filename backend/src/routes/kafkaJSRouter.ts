import { Router } from 'express';
import { kafkaError } from '../utils/index.js';
import type { KafkaJSService } from '../types/index.js';

const createKafkaJSRouter = (service: KafkaJSService): Router => {
  const router = Router();

  // GET /admin/brokers — broker list and cluster controller
  router.get('/brokers', async (_req, res) => {
    try {
      res.json(await service.describeCluster());
    } catch (err) {
      kafkaError(err, res);
    }
  });

  // POST /admin/produce — send a message to a topic
  // Body: { topic: string, messages: [{ key?: string, value: string, partition?: number }] }
  router.post('/produce', async (req, res) => {
    try {
      const { topic, messages } = req.body as {
        topic: string;
        messages: { key?: string; value: string; partition?: number }[];
      };
      if (!topic || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'topic and messages[] are required' });
        return;
      }
      res.status(201).json(await service.produce(topic, messages));
    } catch (err) {
      kafkaError(err, res);
    }
  });
  return router;
};

export default createKafkaJSRouter;
