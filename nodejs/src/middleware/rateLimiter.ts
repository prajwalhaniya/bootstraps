import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { status: 429, error: "Too many requests, please try again later." },
});

export const strictRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { status: 429, error: "Too many requests, please try again later." },
});
