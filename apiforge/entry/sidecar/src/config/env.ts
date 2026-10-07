import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),
    LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.parse(process.env);

export const config = {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
};
