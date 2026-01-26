import { createLogger, transports, format } from "winston";
import "winston-daily-rotate-file";

const enumerateErrorFormat = format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

const isDevelopment = process.env.NODE_ENV !== "production";

const fileTransport = new transports.DailyRotateFile({
    filename: "./logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "info",
    maxSize: "20m",
    maxFiles: "14d",
    format: format.combine(
        format.uncolorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        enumerateErrorFormat(),
        format.splat(),
        format.printf((info) => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
});

const consoleTransport = new transports.Console({
    level: "info",
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        enumerateErrorFormat(),
        format.splat(),
        format.printf((info) => `${info.timestamp} [${info.level}] ${info.message}`)
    ),
});

const transportsList: any[] = [fileTransport];

if (isDevelopment || process.env.LOG_CONSOLE === "true") {
    transportsList.push(consoleTransport);
}

const logger = createLogger({
    level: "info",
    transports: transportsList,
});

export default logger;
