import dotenv from 'dotenv';
dotenv.config();

// ---------------------------------------------------------------------------
// Deployment target
// ---------------------------------------------------------------------------

type Deployment = 'local' | 'aws';

const DEPLOYMENT: Deployment = (() => {
  const raw = process.env.DEPLOYMENT ?? 'local';
  if (raw !== 'local' && raw !== 'aws') {
    throw new Error(`DEPLOYMENT must be "local" or "aws", got "${raw}"`);
  }
  return raw;
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reads an env var, throwing at startup if it is missing or empty. */
const required = (name: string): string => {
  const val = process.env[name];
  if (!val)
    throw new Error(`Missing required environment variable for ${DEPLOYMENT} deployment: ${name}`);
  return val;
};

/** Reads an env var with a fallback. */
const optional = (name: string, fallback: string): string => {
  return process.env[name] ?? fallback;
};

const resolveLogLevel = (): AppConfig['logLevel'] => {
  const raw = process.env.LOG_LEVEL;
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return DEPLOYMENT === 'aws' ? 'info' : 'debug';
};

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

export interface AppConfig {
  deployment: Deployment;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  kafka: {
    clientId: string;
    brokers: string[];
  };
  kafkaConnect: {
    url: string;
  };
  schemaRegistry: {
    url: string;
  };
  apicurioRegistry: {
    url: string;
  };
}

// ---------------------------------------------------------------------------
// Context-switched config
// ---------------------------------------------------------------------------

const buildConfig = (): AppConfig => {
  const clientId = optional('KAFKA_CLIENT_ID', 'kafka-infrastructure-backend');

  if (DEPLOYMENT === 'aws') {
    return {
      deployment: 'aws',
      port: parseInt(optional('PORT', '5000')),
      logLevel: resolveLogLevel(),
      kafka: {
        clientId,
        brokers: required('AWS_KAFKA_BROKERS')
          .split(',')
          .map((b) => b.trim()),
      },
      kafkaConnect: { url: required('AWS_KAFKA_CONNECT_URL') },
      schemaRegistry: { url: required('AWS_SCHEMA_REGISTRY_URL') },
      apicurioRegistry: { url: required('AWS_APICURIO_REGISTRY_URL') },
    };
  }

  return {
    deployment: 'local',
    port: parseInt(optional('PORT', '5000')),
    logLevel: resolveLogLevel(),
    kafka: {
      clientId,
      brokers: optional('KAFKA_BROKERS', 'localhost:9092')
        .split(',')
        .map((b) => b.trim()),
    },
    kafkaConnect: { url: optional('KAFKA_CONNECT_URL', 'http://localhost:8083') },
    schemaRegistry: { url: optional('SCHEMA_REGISTRY_URL', 'http://localhost:8081') },
    apicurioRegistry: {
      url: optional('APICURIO_REGISTRY_URL', 'http://apicurio:8080/apis/registry/v2'),
    },
  };
};

export const config: AppConfig = buildConfig();
