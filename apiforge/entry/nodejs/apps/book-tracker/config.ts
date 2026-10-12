import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export type AiProvider = "openai" | "gemini" | "custom";

/** Presets for `instructor`'s OpenAI-compatible "TOOLS" mode — Gemini via Google's OpenAI
 *  compatibility endpoint, "custom" for any other OpenAI-compatible provider (Groq, Together,
 *  Anyscale, a local proxy, ...) via BOOK_TRACKER_AI_BASE_URL. Only baseURL/key/model differ;
 *  ai.ts's request/response code is the same for all three. */
const AI_PROVIDERS: Record<AiProvider, { apiKeyEnv: string; baseURL?: string; defaultModel: string }> = {
    openai: { apiKeyEnv: "OPENAI_API_KEY", defaultModel: "gpt-4o-mini" },
    gemini: {
        apiKeyEnv: "GEMINI_API_KEY",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        defaultModel: "gemini-3.8-flash",
    },
    custom: { apiKeyEnv: "BOOK_TRACKER_AI_API_KEY", defaultModel: "" },
};

function resolveAiProvider(): AiProvider {
    const explicit = process.env.BOOK_TRACKER_AI_PROVIDER?.toLowerCase();
    if (explicit === "openai" || explicit === "gemini" || explicit === "custom") return explicit;
    // No explicit choice: auto-detect from whichever key is set (checked in this priority order).
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.GEMINI_API_KEY) return "gemini";
    if (process.env.BOOK_TRACKER_AI_API_KEY) return "custom";
    return "openai";
}

const aiProvider = resolveAiProvider();
const aiProviderDefaults = AI_PROVIDERS[aiProvider];
const aiApiKey = process.env[aiProviderDefaults.apiKeyEnv];

/** Access keys the owner hands out, each mapped to the username it should save books under.
 *  Edited by hand (JSON in .env) — there's no sign-up flow, this is the whole "auth" system. */
function parseApiKeys(json: string | undefined): Record<string, string> {
    if (!json) return {};

    try {
        return JSON.parse(json);
    } catch {
        throw new Error('BOOK_TRACKER_API_KEYS must be JSON: {"<api-key>": "<username>"}');
    }
}

export const bookTrackerConfig = {
    uploadsDir: path.join(appDir, "uploads"),
    viewsDir: path.join(appDir, "views"),
    /** Static assets (e.g. the API key widget's script) — served separately from uploads, which
     *  holds user-submitted files rather than app code. */
    publicDir: path.join(appDir, "public"),
    dbPath: process.env.BOOK_TRACKER_DB_PATH ?? path.join(appDir, "data", "books.db"),
    /** Where tesseract.js caches the OCR language data it downloads on first use. */
    ocrCacheDir: path.join(appDir, "data", "ocr-cache"),
    /** "Fill with AI" — a vision LLM call via `instructor`, used when OCR misses fields. Opt-in: off until an API key is set. */
    aiFill: {
        provider: aiProvider,
        apiKeyEnv: aiProviderDefaults.apiKeyEnv,
        apiKey: aiApiKey,
        // BOOK_TRACKER_AI_BASE_URL overrides any preset — lets "openai"/"gemini" point at a proxy,
        // and is how "custom" (any other OpenAI-compatible provider/model) gets its endpoint.
        baseURL: process.env.BOOK_TRACKER_AI_BASE_URL ?? aiProviderDefaults.baseURL,
        model: process.env.BOOK_TRACKER_AI_MODEL || aiProviderDefaults.defaultModel,
        enabled: Boolean(aiApiKey),
    },
    /** apiKey -> username. Scanning and saving books require one of these; viewing never does. */
    apiKeys: parseApiKeys(process.env.BOOK_TRACKER_API_KEYS),
};
