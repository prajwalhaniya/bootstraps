import { config } from "../config/env.js";

const levels = ["error", "warn", "info", "debug"] as const;
type Level = (typeof levels)[number];

function shouldLog(level: Level): boolean {
    return levels.indexOf(level) <= levels.indexOf(config.logLevel as Level);
}

function log(level: Level, message: string) {
    if (!shouldLog(level)) return;
    const timestamp = new Date().toISOString();
    console[level === "debug" ? "log" : level](`${timestamp} [${level.toUpperCase()}] ${message}`);
}

export const logger = {
    error: (message: string) => log("error", message),
    warn: (message: string) => log("warn", message),
    info: (message: string) => log("info", message),
    debug: (message: string) => log("debug", message),
};
