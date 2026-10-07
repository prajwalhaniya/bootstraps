import morgan from "morgan";
import { config } from "../config/env.js";

export const requestLogger = morgan(config.nodeEnv === "production" ? "combined" : "dev");
