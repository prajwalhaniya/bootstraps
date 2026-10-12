import fs from "node:fs";
import path from "node:path";
import Instructor from "@instructor-ai/instructor";
import OpenAI from "openai";
import { z } from "zod";
import { bookTrackerConfig } from "./config.js";
import { HttpError } from "../../common/middleware/errorHandler.js";
import type { ParsedBookFields } from "./types.js";

const BookFieldsSchema = z.object({
    title: z.string().describe("The book's title, exactly as printed on the front cover"),
    author: z.string().describe("The author's full name"),
    isbn: z.string().describe("The ISBN-10 or ISBN-13 (digits and hyphens only); empty string if not visible"),
    publisher: z.string().describe("The publisher's name; empty string if not visible"),
    price: z.string().describe('The printed price with its currency symbol/code, e.g. "$14.99"; empty string if not visible'),
});

let instructorClient: ReturnType<typeof Instructor> | null = null;

function getClient() {
    if (!bookTrackerConfig.aiFill.enabled) {
        throw new HttpError(400, `AI fill is not configured — set ${bookTrackerConfig.aiFill.apiKeyEnv} to enable it`);
    }
    if (bookTrackerConfig.aiFill.provider === "custom" && !bookTrackerConfig.aiFill.model) {
        throw new HttpError(400, "BOOK_TRACKER_AI_PROVIDER=custom needs BOOK_TRACKER_AI_MODEL set too");
    }
    if (!instructorClient) {
        const openai = new OpenAI({
            apiKey: bookTrackerConfig.aiFill.apiKey,
            baseURL: bookTrackerConfig.aiFill.baseURL,
        });
        instructorClient = Instructor({ client: openai, mode: "TOOLS" });
    }
    return instructorClient;
}

function toImageDataUrl(imagePath: string): string {
    const ext = path.extname(imagePath).slice(1).toLowerCase() || "png";
    const base64 = fs.readFileSync(imagePath).toString("base64");
    return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${base64}`;
}

/** Vision LLM fallback for when OCR can't read a cover clearly. */
export async function extractFieldsWithAI(frontCoverPath: string, backCoverPath: string): Promise<ParsedBookFields> {
    const instructor = getClient();

    try {
        const { _meta, ...fields } = await instructor.chat.completions.create({
            model: bookTrackerConfig.aiFill.model,
            max_tokens: 500,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "These images are the front and back cover of a book. Read off its title, author, ISBN, publisher and price. Leave a field as an empty string if it truly isn't visible on either cover.",
                        },
                        { type: "image_url", image_url: { url: toImageDataUrl(frontCoverPath) } },
                        { type: "image_url", image_url: { url: toImageDataUrl(backCoverPath) } },
                    ],
                },
            ],
            response_model: { schema: BookFieldsSchema, name: "BookCoverFields" },
            max_retries: 2,
        });

        return fields;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new HttpError(502, `AI fill failed: ${message}`);
    }
}
