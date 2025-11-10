import fs from 'fs';
import path from 'path';
import { inspect } from 'util';
import { config } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMethod = (message: string, meta?: unknown) => void;

const isProduction = config.nodeEnv === 'production';
const logDirectory = path.resolve(process.cwd(), 'logs');
const logFilePath = path.join(logDirectory, 'application.log');

let fileStream: fs.WriteStream | null = null;

if (isProduction) {
  try {
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }

    fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    fileStream.on('error', (error) => {
      console.error('Logger stream error', error);
    });

    process.on('exit', () => {
      fileStream?.end();
    });
  } catch (error) {
    console.error('Failed to initialise file logger', error);
    fileStream = null;
  }
}

const consoleWriters: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: (console.debug ?? console.log).bind(console),
  info: (console.info ?? console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const serializeMeta = (meta: unknown): string | undefined => {
  if (meta === undefined || meta === null) {
    return undefined;
  }

  if (typeof meta === 'string') {
    return meta;
  }

  if (meta instanceof Error) {
    return JSON.stringify(
      {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      },
      null,
      2
    );
  }

  try {
    return JSON.stringify(meta);
  } catch {
    return inspect(meta, { depth: null });
  }
};

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const timestamp = new Date().toISOString();
  const serializedMeta = serializeMeta(meta);
  const entry = serializedMeta
    ? `[${timestamp}] [${level.toUpperCase()}] ${message} | ${serializedMeta}`
    : `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (isProduction && fileStream) {
    fileStream.write(`${entry}\n`);
    return;
  }

  consoleWriters[level](entry);
};

const buildLoggerMethod =
  (level: LogLevel): LogMethod =>
  (message, meta) => {
    log(level, message, meta);
  };

const withContext = (context: Record<string, unknown>) => {
  const mergeMeta = (meta?: unknown) => {
    if (meta === undefined || meta === null) {
      return context;
    }

    if (typeof meta === 'object' && !Array.isArray(meta) && meta !== null) {
      return { ...context, ...(meta as Record<string, unknown>) };
    }

    return { ...context, data: meta };
  };

  return {
    debug: (message: string, meta?: unknown) => log('debug', message, mergeMeta(meta)),
    info: (message: string, meta?: unknown) => log('info', message, mergeMeta(meta)),
    warn: (message: string, meta?: unknown) => log('warn', message, mergeMeta(meta)),
    error: (message: string, meta?: unknown) => log('error', message, mergeMeta(meta)),
  };
};

export const logger = {
  debug: buildLoggerMethod('debug'),
  info: buildLoggerMethod('info'),
  warn: buildLoggerMethod('warn'),
  error: buildLoggerMethod('error'),
  withContext,
};

export type Logger = typeof logger;

