import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../common/middleware/errorHandler.js";
import { bookTrackerConfig } from "./config.js";

/**
 * There's no login flow — the owner hands out API keys (BOOK_TRACKER_API_KEYS) and each one maps
 * to a username. The UI stores the key in localStorage and sends it as a hidden form field; this
 * just looks it up. Viewing books stays open to everyone; this only guards scan/ai-fill/save.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    const username = apiKey ? bookTrackerConfig.apiKeys[apiKey] : undefined;

    if (!username) {
        throw new HttpError(401, "A valid API key is required to scan or save books");
    }

    res.locals.username = username;
    next();
}
