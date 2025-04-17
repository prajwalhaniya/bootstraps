import { createLogger, transports, format } from 'winston';
import "winston-daily-rotate-file";

const enumerateErrorFormat = format((info) => {
    if (info instanceof Error) {
      Object.assign(info, { message: info.stack });
    }
    return info;
});

const transport = new transports.DailyRotateFile({
    filename: "./logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "info",
    maxSize: "20m",
    maxFiles: "14d"
})

const logger = createLogger({
    level: 'info',
    transports: transport,
    format: format.combine(
        format.uncolorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        enumerateErrorFormat(),
        format.splat(),
        format.printf(
          (info) => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`,
        ),
    )
});

export default logger;