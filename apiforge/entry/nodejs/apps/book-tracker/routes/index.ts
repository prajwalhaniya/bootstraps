import express, { Router } from "express";
import { requireApiKey } from "../auth.js";
import { bookTrackerConfig } from "../config.js";
import { aiFillCovers, createBook, listBooks, renderUploadForm, scanCovers } from "../controller.js";
import { coverUpload } from "../upload.js";

const router = Router();

router.use(express.urlencoded({ extended: true }));
router.use("/uploads", express.static(bookTrackerConfig.uploadsDir));
router.use("/static", express.static(bookTrackerConfig.publicDir));

// Viewing is open to everyone; scanning and saving need a valid API key (requireApiKey).
router.get("/", renderUploadForm);
router.post(
    "/scan",
    coverUpload.fields([{ name: "frontCover", maxCount: 1 }, { name: "backCover", maxCount: 1 }]),
    requireApiKey,
    scanCovers,
);
router.post("/ai-fill", requireApiKey, aiFillCovers);
router.post("/books", requireApiKey, createBook);
router.get("/books", listBooks);

export default router;
