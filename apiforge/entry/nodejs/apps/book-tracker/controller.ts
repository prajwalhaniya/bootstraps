import path from "node:path";
import ejs from "ejs";
import type { Request, Response } from "express";
import { HttpError } from "../../common/middleware/errorHandler.js";
import { extractFieldsWithAI } from "./ai.js";
import { bookTrackerConfig } from "./config.js";
import { bookRepository } from "./db.js";
import { extractText } from "./ocr.js";
import { parseBookFields } from "./parser.js";
import type { ParsedBookFields } from "./types.js";

function renderView(name: string, data: Record<string, unknown>): Promise<string> {
    return ejs.renderFile(path.join(bookTrackerConfig.viewsDir, `${name}.ejs`), data);
}

function renderUpload(data: { parsed: ParsedBookFields | null; frontCoverFile: string | null; backCoverFile: string | null }) {
    return renderView("upload", { ...data, aiFillEnabled: bookTrackerConfig.aiFill.enabled });
}

interface CoverFiles {
    frontCover?: Express.Multer.File[];
    backCover?: Express.Multer.File[];
}

export async function renderUploadForm(_req: Request, res: Response) {
    const html = await renderUpload({ parsed: null, frontCoverFile: null, backCoverFile: null });
    res.send(html);
}

export async function scanCovers(req: Request, res: Response) {
    const files = req.files as CoverFiles | undefined;
    const frontCover = files?.frontCover?.[0];
    const backCover = files?.backCover?.[0];

    if (!frontCover || !backCover) {
        throw new HttpError(400, "Both a front and back cover image are required");
    }

    const [frontText, backText] = await Promise.all([
        extractText(frontCover.path),
        extractText(backCover.path),
    ]);
    const parsed: ParsedBookFields = parseBookFields(frontText, backText);

    const html = await renderUpload({
        parsed,
        frontCoverFile: frontCover.filename,
        backCoverFile: backCover.filename,
    });
    res.send(html);
}

/** Resolve a cover filename from form input back to its path, refusing anything outside uploadsDir. */
function resolveCoverPath(filename: unknown): string {
    if (typeof filename !== "string" || !filename) {
        throw new HttpError(400, "Both scanned cover images are required");
    }
    return path.join(bookTrackerConfig.uploadsDir, path.basename(filename));
}

export async function aiFillCovers(req: Request, res: Response) {
    const { frontCoverFile, backCoverFile } = req.body;

    const frontPath = resolveCoverPath(frontCoverFile);
    const backPath = resolveCoverPath(backCoverFile);

    // Replace with the AI's reading outright — OCR fills every field with its best guess even
    // when wrong, so "keep whatever's non-empty" would just keep the bad OCR guess over this.
    const parsed: ParsedBookFields = await extractFieldsWithAI(frontPath, backPath);

    const html = await renderUpload({ parsed, frontCoverFile, backCoverFile });
    res.send(html);
}

export function createBook(req: Request, res: Response) {
    const { title, author, isbn, publisher, price, frontCoverFile, backCoverFile } = req.body;

    if (!title || !frontCoverFile || !backCoverFile) {
        throw new HttpError(400, "Title and both scanned cover images are required");
    }

    bookRepository.create({
        title,
        author: author ?? "",
        isbn: isbn ?? "",
        publisher: publisher ?? "",
        price: price ?? "",
        frontCoverPath: frontCoverFile,
        backCoverPath: backCoverFile,
        // Set by requireApiKey from the submitted key — never taken from the request body itself.
        createdBy: res.locals.username,
    });

    res.redirect("/app/js/book-tracker/books");
}

export async function listBooks(req: Request, res: Response) {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const page = Number.parseInt(String(req.query.page ?? "1"), 10) || 1;

    const html = await renderView("books", { ...bookRepository.list(query, page), query });
    res.send(html);
}
