import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { pinoHttp } from 'pino-http';
import createKafkaConnectRouter from './routes/kafkaConnectRouter.js';
import createKafkaJSRouter from './routes/kafkaJSRouter.js';
import createTopicGroupRouter from './routes/topicGroupRouter.js';
import createKafkaJSTopicRouter from './routes/kafkaJSTopicRouter.js';
import kafkaJSService from './services/kafkaJSService.js';
import { config } from './config.js';
import cors from 'cors';
import kafkaConnectService from './services/kafkaConnectService.js';
import { logger, httpLogger } from './logger.js';

const port = config.port || 5000;
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger: httpLogger,
    autoLogging: { ignore: (req) => req.url === '/health' },
    customSuccessMessage: (req, res, responseTime) =>
      `${req.method} ${req.url} ${String(res.statusCode)} ${String(responseTime)}ms`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${String(res.statusCode)} — ${err.message}`,
  })
);
app.use('/health', (_req, res) => res.status(200).send('OK'));
app.use('/api', createKafkaConnectRouter(kafkaConnectService));
app.use('/api/admin', createKafkaJSRouter(kafkaJSService));
app.use('/api/admin/topics', createKafkaJSTopicRouter(kafkaJSService));
app.use('/api/topic-groups', createTopicGroupRouter());

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(port, () => {
  logger.info(
    { port, deployment: config.deployment, logLevel: config.logLevel },
    'Backend listening'
  );
});
