import pino from 'pino';
import { config } from './config.js';

const transport =
  config.logLevel === 'debug'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined;

export const logger = pino({
  level: config.logLevel,
  transport,
  serializers: { responseTime: () => undefined },
});

export const httpLogger = logger.child({ module: 'http' });
export const kafkaLogger = logger.child({ module: 'kafka' });
export const connectLogger = logger.child({ module: 'kafka-connect' });