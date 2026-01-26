import morgan from "morgan";
import { Request, Response } from "express";
import logger from "../services/logger/index.js";

morgan.token("request-id", (req: Request) => {
    return (req as any).id || "-";
});

morgan.token("ip", (req: Request) => {
    return req.ip || req.socket.remoteAddress || "-";
});

const morganStream = {
    write: (message: string) => {
        const trimmed = message.trim();

        const parts = trimmed.split("|").map((p) => p.trim());

        if (parts.length >= 6) {
            const method = parts[0];
            const url = parts[1];
            const statusCode = parseInt(parts[2], 10);
            const responseTime = parts[3];
            const contentLength = parts[4] !== "-" ? parseInt(parts[4], 10) : null;
            const requestId = parts[5] !== "-" ? parts[5] : null;
            const ip = parts[6] !== "-" ? parts[6] : null;

            const logData: Record<string, any> = {
                method,
                url,
                statusCode,
                responseTime,
            };

            if (contentLength !== null) logData.contentLength = contentLength;
            if (requestId !== null) logData.requestId = requestId;
            if (ip !== null) logData.ip = ip;

            const messageText = `HTTP Request ${JSON.stringify(logData)}`;

            if (statusCode >= 500) {
                logger.error(messageText);
            } else if (statusCode >= 400) {
                logger.warn(messageText);
            } else {
                logger.info(messageText);
            }
        } else {
            logger.info(trimmed);
        }
    },
};

const customFormat = ":method | :url | :status | :response-time ms | :res[content-length] | :request-id | :ip";

export const morganLogger = morgan(customFormat, {
    stream: morganStream,
    skip: (req: Request, res: Response) => {
        return false;
    },
});
