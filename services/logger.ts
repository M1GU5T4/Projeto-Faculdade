type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const isDevelopment = process.env.NODE_ENV !== 'production';

const formatPrefix = (level: LogLevel, context?: string, action?: string) => {
  const base = `[${level}]`;
  if (context && action) {
    return `${base} [${context}] ${action}`;
  }
  if (context) {
    return `${base} ${context}`;
  }
  return base;
};

const writeLog = (level: LogLevel, contextOrMessage: string, actionOrPayload?: unknown, maybePayload?: unknown) => {
  const hasStructuredContext = typeof actionOrPayload === 'string';
  const prefix = hasStructuredContext
    ? formatPrefix(level, contextOrMessage, actionOrPayload as string)
    : formatPrefix(level, contextOrMessage);
  const payload = hasStructuredContext ? maybePayload : actionOrPayload;

  switch (level) {
    case 'ERROR':
      console.error(prefix, payload ?? '');
      break;
    case 'WARN':
      console.warn(prefix, payload ?? '');
      break;
    case 'DEBUG':
      if (isDevelopment) {
        console.debug(prefix, payload ?? '');
      }
      break;
    default:
      console.log(prefix, payload ?? '');
      break;
  }
};

export const logger = {
  info: (contextOrMessage: string, actionOrPayload?: unknown, maybePayload?: unknown) => {
    writeLog('INFO', contextOrMessage, actionOrPayload, maybePayload);
  },

  error: (contextOrMessage: string, actionOrPayload?: unknown, maybePayload?: unknown) => {
    writeLog('ERROR', contextOrMessage, actionOrPayload, maybePayload);
  },

  warn: (contextOrMessage: string, actionOrPayload?: unknown, maybePayload?: unknown) => {
    writeLog('WARN', contextOrMessage, actionOrPayload, maybePayload);
  },

  debug: (contextOrMessage: string, actionOrPayload?: unknown, maybePayload?: unknown) => {
    writeLog('DEBUG', contextOrMessage, actionOrPayload, maybePayload);
  },

  startTimer: (context: string, action: string) => {
    const startedAt = performance.now();
    logger.info(context, `${action}_START`);

    return () => {
      const durationMs = Number((performance.now() - startedAt).toFixed(2));
      logger.info(context, `${action}_END`, { durationMs });
    };
  },

  saveStart: (entity: string, operation: string, payload?: unknown) => {
    logger.info(entity, `${operation}_START`, payload);
  },

  saveSuccess: (entity: string, operation: string, payload?: unknown) => {
    logger.info(entity, `${operation}_SUCCESS`, payload);
  },

  saveError: (entity: string, operation: string, payload?: unknown, error?: unknown) => {
    logger.error(entity, `${operation}_ERROR`, { payload, error });
  },
};
