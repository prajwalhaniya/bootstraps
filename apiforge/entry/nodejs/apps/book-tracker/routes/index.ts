import express, { Router } from "express";
import { bookTrackerConfig } from "../config.js";
import { aiFillCovers, createBook, listBooks, renderUploadForm, scanCovers } from "../controller.js";
import { coverUpload } from "../upload.js";

const router = Router();

router.use(express.urlencoded({ extended: true }));
router.use("/uploads", express.static(bookTrackerConfig.uploadsDir));

router.get("/", renderUploadForm);
router.post("/scan", coverUpload.fields([{ name: "frontCover", maxCount: 1 }, { name: "backCover", maxCount: 1 }]), scanCovers);
router.post("/ai-fill", aiFillCovers);
router.post("/books", createBook);
router.get("/books", listBooks);

export default router;
