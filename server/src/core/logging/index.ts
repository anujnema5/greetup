import path from "node:path";
import pino, { type Logger, type LoggerOptions } from "pino";

type LogMeta = unknown;
type LogLevel = "info" | "warn" | "error" | "debug";

const defaultLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

const baseOptions: LoggerOptions = {
    level: defaultLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
};

const buildLogger = (): Logger => {
    if (process.env.NODE_ENV === "production") {
        return pino(baseOptions, pino.destination(path.resolve(process.cwd(), "../logs/combined.log")));
    }

    return pino({
        ...baseOptions,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                singleLine: true,
                ignore: "pid,hostname",
            },
        },
    });
};

const pinoLogger = buildLogger();

const write = (level: LogLevel, message: string, meta?: LogMeta): void => {
    if (meta === undefined) {
        pinoLogger[level](message);
        return;
    }

    if (meta instanceof Error) {
        pinoLogger[level]({ err: meta }, message);
        return;
    }

    if (typeof meta === "object" && meta !== null) {
        pinoLogger[level](meta as Record<string, unknown>, message);
        return;
    }

    pinoLogger[level]({ meta }, message);
};

const logger = {
    info(message: string, meta?: LogMeta): void {
        write("info", message, meta);
    },
    warn(message: string, meta?: LogMeta): void {
        write("warn", message, meta);
    },
    error(message: string, meta?: LogMeta): void {
        write("error", message, meta);
    },
    debug(message: string, meta?: LogMeta): void {
        write("debug", message, meta);
    },
};

export default logger;
