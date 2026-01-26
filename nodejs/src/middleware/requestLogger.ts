// src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from "express";
import logger from "../services/logger/index.js";

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    const requestId =
        (req.headers["x-request-id"] as string) ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    res.setHeader("X-Request-ID", requestId);

    const requestLog: Record<string, any> = {
        requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get("user-agent"),
    };

    if (Object.keys(req.query).length > 0) {
        requestLog.query = req.query;
    }

    if (req.body && Object.keys(req.body).length > 0) {
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.length < 1000) {
            requestLog.body = req.body;
        } else {
            requestLog.bodySize = bodyStr.length;
        }
    }

    res.on("finish", () => {
        const responseTime = Date.now() - startTime;
        const contentLength = res.get("content-length");

        const responseLog: Record<string, any> = {
            requestId,
            method: req.method,
            url: req.url,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            responseTimeMs: responseTime,
        };

        if (contentLength) {
            responseLog.contentLength = parseInt(contentLength, 10);
        }

        if (res.statusCode >= 500) {
            logger.error("Outgoing response", responseLog);
        } else if (res.statusCode >= 400) {
            logger.warn("Outgoing response", responseLog);
        }
    });

    next();
};
