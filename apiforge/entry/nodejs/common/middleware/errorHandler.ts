import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export class HttpError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
    }

    logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
    res.status(500).json({ error: "Internal server error" });
}
