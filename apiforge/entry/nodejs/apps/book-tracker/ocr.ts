import fs from "node:fs";
import { createWorker, type Worker } from "tesseract.js";
import { bookTrackerConfig } from "./config.js";

fs.mkdirSync(bookTrackerConfig.ocrCacheDir, { recursive: true });

/** One shared worker, started lazily on first scan and kept alive for the life of the server. */
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
    if (!workerPromise) {
        workerPromise = createWorker("eng", undefined, { cachePath: bookTrackerConfig.ocrCacheDir });
    }
    return workerPromise;
}

export async function extractText(imagePath: string): Promise<string> {
    const worker = await getWorker();
    const {
        data: { text },
    } = await worker.recognize(imagePath);
    return text;
}
