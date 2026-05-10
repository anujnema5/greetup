import pino from "pino";

type LogMeta = unknown;
type LogLevel = "info" | "warn" | "error" | "debug";

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true,
            ignore: "pid,hostname",
          },
        },
});

const write = (level: LogLevel, message: string, meta?: LogMeta): void => {
  if (meta === undefined) {
    baseLogger[level](message);
    return;
  }
  if (meta instanceof Error) {
    baseLogger[level]({ err: meta }, message);
    return;
  }
  if (typeof meta === "object" && meta !== null) {
    baseLogger[level](meta as Record<string, unknown>, message);
    return;
  }
  baseLogger[level]({ meta }, message);
};

export const logger = {
  info(message: string, meta?: LogMeta): void { write("info", message, meta); },
  warn(message: string, meta?: LogMeta): void { write("warn", message, meta); },
  error(message: string, meta?: LogMeta): void { write("error", message, meta); },
  debug(message: string, meta?: LogMeta): void { write("debug", message, meta); },
};

export default logger;
