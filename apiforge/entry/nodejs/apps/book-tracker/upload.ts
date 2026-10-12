import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { bookTrackerConfig } from "./config.js";

fs.mkdirSync(bookTrackerConfig.uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: bookTrackerConfig.uploadsDir,
    filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
    },
});

export const coverUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith("image/"));
    },
});
